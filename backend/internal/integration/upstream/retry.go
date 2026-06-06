package upstream

import (
	"context"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// RetryPolicy configures transient upstream retries.
type RetryPolicy struct {
	MaxRetries int
	BaseDelay  time.Duration
	MaxDelay   time.Duration
}

// Normalized returns policy with safe defaults.
func (p RetryPolicy) Normalized() RetryPolicy {
	out := p
	if out.MaxRetries < 0 {
		out.MaxRetries = 0
	}
	if out.BaseDelay <= 0 {
		out.BaseDelay = time.Second
	}
	if out.MaxDelay <= 0 {
		out.MaxDelay = 30 * time.Second
	}
	return out
}

// RetryableStatus reports whether an HTTP status should be retried.
func RetryableStatus(code int) bool {
	return code == http.StatusTooManyRequests ||
		code == http.StatusBadGateway ||
		code == http.StatusServiceUnavailable ||
		code == http.StatusGatewayTimeout
}

// ParseRetryAfter reads the Retry-After header when present.
func ParseRetryAfter(resp *http.Response) time.Duration {
	if resp == nil {
		return 0
	}
	raw := strings.TrimSpace(resp.Header.Get("Retry-After"))
	if raw == "" {
		return 0
	}
	if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	if t, err := http.ParseTime(raw); err == nil {
		d := time.Until(t)
		if d > 0 {
			return d
		}
	}
	return 0
}

func (p RetryPolicy) delay(attempt int, retryAfter time.Duration) time.Duration {
	if retryAfter > 0 {
		return retryAfter
	}
	p = p.Normalized()
	delay := p.BaseDelay * time.Duration(1<<attempt)
	if delay > p.MaxDelay {
		delay = p.MaxDelay
	}
	jitter := time.Duration(rand.Int63n(int64(delay / 5)))
	return delay + jitter
}

// SleepBackoff waits before the next retry attempt.
func (p RetryPolicy) SleepBackoff(ctx context.Context, attempt int, retryAfter time.Duration) error {
	timer := time.NewTimer(p.delay(attempt, retryAfter))
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
