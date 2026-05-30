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
)

const defaultHTTPTimeout = 120 * time.Second

// Client calls Ozon Seller API (api-seller.ozon.ru). Auth: Client-Id + Api-Key headers.
type Client struct {
	baseURL    string
	clientID   string
	apiKey     string
	httpClient *http.Client
}

func NewClient(baseURL, clientID, apiKey string) *Client {
	return &Client{
		baseURL:  strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		clientID: strings.TrimSpace(clientID),
		apiKey:   strings.TrimSpace(apiKey),
	}
}

func (c *Client) configured() bool {
	return c.clientID != "" && c.apiKey != ""
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
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Client-Id", c.clientID)
	req.Header.Set("Api-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	limit := maxBody
	if limit <= 0 {
		limit = 32 << 20
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, limit))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if resp.StatusCode != http.StatusOK {
		return raw, resp.StatusCode, fmt.Errorf("ozon POST %s: status %d: %s", path, resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	return raw, resp.StatusCode, nil
}
