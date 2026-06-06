package ozon

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"warehouse-backend/internal/integration/integrationlog"
	"warehouse-backend/internal/integration/upstream"

	"github.com/rs/zerolog/log"
)

const defaultHTTPTimeout = 120 * time.Second

// Client calls Ozon Seller API (api-seller.ozon.ru). Auth: Client-Id + Api-Key headers.
type Client struct {
	baseURL    string
	clientID   string
	apiKey     string
	httpClient *http.Client
	limiter    *upstream.Limiter
	retry      upstream.RetryPolicy
}

func NewClient(baseURL, clientID, apiKey string) *Client {
	return &Client{
		baseURL:  strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		clientID: strings.TrimSpace(clientID),
		apiKey:   strings.TrimSpace(apiKey),
		limiter:  upstream.Ozon,
		retry:    upstream.Retry,
	}
}

func (c *Client) configured() bool {
	return c.clientID != "" && c.apiKey != ""
}

func (c *Client) externalCall(path string) integrationlog.ExternalCall {
	return integrationlog.OzonPOST(c.baseURL, path)
}

func (c *Client) waitThrottle(ctx context.Context) error {
	if c.limiter == nil {
		return nil
	}
	return c.limiter.Wait(ctx)
}

func (c *Client) postJSON(ctx context.Context, path string, body any, maxBody int64) ([]byte, int, error) {
	if !c.configured() {
		return nil, 0, ErrCredentialsMissing
	}
	if c.httpClient == nil {
		c.httpClient = &http.Client{Timeout: defaultHTTPTimeout}
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, 0, err
	}

	call := c.externalCall(path)
	policy := c.retry.Normalized()
	var lastStatus int
	var lastErr error

	for attempt := 0; attempt <= policy.MaxRetries; attempt++ {
		if err := c.waitThrottle(ctx); err != nil {
			return nil, 0, err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
		if err != nil {
			return nil, 0, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Client-Id", c.clientID)
		req.Header.Set("Api-Key", c.apiKey)
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(bytes.NewReader(payload)), nil
		}

		started := time.Now()
		resp, err := c.httpClient.Do(req)
		duration := time.Since(started)
		if err != nil {
			lastErr = err
			integrationlog.LogExternalCall(log.Debug().Err(err).Dur("duration", duration).Int("attempt", attempt), call).
				Msg("ozon upstream request failed")
			if attempt < policy.MaxRetries {
				if waitErr := policy.SleepBackoff(ctx, attempt, 0); waitErr != nil {
					return nil, 0, waitErr
				}
				continue
			}
			return nil, 0, err
		}

		limit := maxBody
		if limit <= 0 {
			limit = 32 << 20
		}
		raw, readErr := io.ReadAll(io.LimitReader(resp.Body, limit))
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, resp.StatusCode, readErr
		}

		lastStatus = resp.StatusCode
		if resp.StatusCode == http.StatusOK {
			integrationlog.LogExternalCall(log.Debug().Int("http_status", resp.StatusCode).Dur("duration", duration).Int("attempt", attempt), call).
				Msg("ozon upstream request")
			return raw, resp.StatusCode, nil
		}

		safeBody := integrationlog.Truncate(strings.TrimSpace(string(raw)), 240)
		lastErr = fmt.Errorf("ozon %s %s: status %d: %s", call.Method, call.FullURL(), resp.StatusCode, safeBody)
		integrationlog.LogExternalCall(log.Warn().Int("http_status", resp.StatusCode).Dur("duration", duration).Int("attempt", attempt), call).
			Str("response_body", safeBody).
			Msg("ozon upstream request error status")

		if upstream.RetryableStatus(resp.StatusCode) && attempt < policy.MaxRetries {
			if waitErr := policy.SleepBackoff(ctx, attempt, upstream.ParseRetryAfter(resp)); waitErr != nil {
				return raw, resp.StatusCode, waitErr
			}
			continue
		}
		return raw, resp.StatusCode, lastErr
	}

	if lastErr != nil {
		return nil, lastStatus, lastErr
	}
	return nil, lastStatus, fmt.Errorf("ozon %s %s: request failed", call.Method, call.FullURL())
}
