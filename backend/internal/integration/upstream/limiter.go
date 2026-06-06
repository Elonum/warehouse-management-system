package upstream

import (
	"context"
	"sync"
	"time"
)

// Limiter is a token-bucket rate limiter with an optional minimum interval between grants.
// Suitable for marketplace upstream APIs (WB personal token: burst 10, refill 1/min).
type Limiter struct {
	mu sync.Mutex

	name string

	capacity   float64
	tokens     float64
	refillRate float64 // tokens per second
	lastRefill time.Time

	minInterval time.Duration
	lastGrant   time.Time
}

// NewLimiter creates a limiter.
// capacity: max burst size; refillInterval: time to add one token (sustained rate).
func NewLimiter(name string, capacity int, refillInterval time.Duration, minInterval time.Duration) *Limiter {
	if capacity < 1 {
		capacity = 1
	}
	if refillInterval <= 0 {
		refillInterval = time.Minute
	}
	return &Limiter{
		name:        name,
		capacity:    float64(capacity),
		tokens:      float64(capacity),
		refillRate:  1 / refillInterval.Seconds(),
		lastRefill:  time.Now(),
		minInterval: minInterval,
	}
}

// Wait blocks until a request slot is available or ctx is cancelled.
func (l *Limiter) Wait(ctx context.Context) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		wait, ok := l.reserveWait()
		if !ok {
			return nil
		}
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (l *Limiter) reserveWait() (time.Duration, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	l.refill(now)

	if l.tokens < 1 {
		deficit := 1 - l.tokens
		return time.Duration(deficit/l.refillRate*float64(time.Second)), true
	}

	if l.minInterval > 0 && !l.lastGrant.IsZero() {
		elapsed := now.Sub(l.lastGrant)
		if elapsed < l.minInterval {
			return l.minInterval - elapsed, true
		}
	}

	l.tokens--
	l.lastGrant = now
	return 0, false
}

func (l *Limiter) refill(now time.Time) {
	if l.lastRefill.IsZero() {
		l.lastRefill = now
		return
	}
	elapsed := now.Sub(l.lastRefill).Seconds()
	if elapsed <= 0 {
		return
	}
	l.tokens += elapsed * l.refillRate
	if l.tokens > l.capacity {
		l.tokens = l.capacity
	}
	l.lastRefill = now
}
