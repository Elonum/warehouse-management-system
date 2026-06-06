package wildberries

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"warehouse-backend/internal/integration/integrationlog"
	"warehouse-backend/internal/integration/upstream"

	"github.com/rs/zerolog/log"
)

const (
	// SupplierStocksAPIPath — GET остатков в WB Statistics API (отдельный хост statistics-api.wildberries.ru).
	SupplierStocksAPIPath = "/api/v1/supplier/stocks"

	statisticsHTTPTimeout = 120 * time.Second
	// WB Statistics: максимум строк за один запрос; дальше сдвигают dateFrom по lastChangeDate последней записи.
	supplierStocksMaxRowsPerRequest = 60_000
)

// StatisticsClient вызывает Statistics API WB (остатки, отчёты). Токен — отдельная категория в кабинете («Статистика»).
type StatisticsClient struct {
	baseURL    string
	token      string
	httpClient *http.Client
	limiter    *upstream.Limiter
	retry      upstream.RetryPolicy
}

// SupplierStocksCall describes the upstream WB Statistics stocks endpoint.
func SupplierStocksCall(baseURL string) integrationlog.ExternalCall {
	return integrationlog.WildberriesGET(baseURL, SupplierStocksAPIPath)
}

func NewStatisticsClient(baseURL, token string) *StatisticsClient {
	return &StatisticsClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		httpClient: &http.Client{
			Timeout: statisticsHTTPTimeout,
		},
		limiter: upstream.Wildberries,
		retry:   upstream.Retry,
	}
}

// SupplierStockRow — строка GET /api/v1/supplier/stocks (неиспользуемые поля ответа WB отбрасываются при decode).
type SupplierStockRow struct {
	LastChangeDate  string `json:"lastChangeDate"`
	WarehouseName   string `json:"warehouseName"`
	SupplierArticle string `json:"supplierArticle"`
	NmID            int64  `json:"nmId"`
	Barcode         string `json:"barcode"`
	TechSize        string `json:"techSize"`
	Quantity        int    `json:"quantity"`
	QuantityFull    int    `json:"quantityFull"`
}

// FetchAllSupplierStocks загружает все страницы остатков согласно правилам WB (пагинация по dateFrom / lastChangeDate).
func (c *StatisticsClient) FetchAllSupplierStocks(ctx context.Context, dateFromRFC3339 string) ([]SupplierStockRow, error) {
	if c.token == "" {
		return nil, errors.New("wildberries statistics token missing")
	}
	var all []SupplierStockRow
	cursor := dateFromRFC3339
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		rows, err := c.fetchSupplierStocksPage(ctx, cursor)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			break
		}
		all = append(all, rows...)
		if len(rows) < supplierStocksMaxRowsPerRequest {
			break
		}
		last := strings.TrimSpace(rows[len(rows)-1].LastChangeDate)
		if last == "" || last == cursor {
			break
		}
		cursor = last
	}
	return all, nil
}

func (c *StatisticsClient) waitThrottle(ctx context.Context) error {
	if c.limiter == nil {
		return nil
	}
	return c.limiter.Wait(ctx)
}

func (c *StatisticsClient) fetchSupplierStocksPage(ctx context.Context, dateFrom string) ([]SupplierStockRow, error) {
	u, err := url.Parse(c.baseURL + SupplierStocksAPIPath)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("dateFrom", dateFrom)
	u.RawQuery = q.Encode()

	call := SupplierStocksCall(c.baseURL)
	policy := c.retry.Normalized()
	var lastErr error

	for attempt := 0; attempt <= policy.MaxRetries; attempt++ {
		if err := c.waitThrottle(ctx); err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", c.token)

		started := time.Now()
		resp, err := c.httpClient.Do(req)
		duration := time.Since(started)
		if err != nil {
			lastErr = err
			integrationlog.LogExternalCall(log.Debug().Err(err).Dur("duration", duration).Str("date_from", dateFrom).Int("attempt", attempt), call).
				Msg("wildberries upstream request failed")
			if attempt < policy.MaxRetries {
				if waitErr := policy.SleepBackoff(ctx, attempt, 0); waitErr != nil {
					return nil, waitErr
				}
				continue
			}
			return nil, err
		}

		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, readErr
		}

		if resp.StatusCode != http.StatusOK {
			safeBody := integrationlog.Truncate(strings.TrimSpace(string(body)), 240)
			lastErr = fmt.Errorf("wildberries statistics %s %s?dateFrom=%s: status %d: %s",
				call.Method, call.FullURL(), url.QueryEscape(dateFrom), resp.StatusCode, safeBody)
			integrationlog.LogExternalCall(log.Warn().
				Int("http_status", resp.StatusCode).
				Dur("duration", duration).
				Str("date_from", dateFrom).
				Str("request_url", u.String()).
				Int("attempt", attempt), call).
				Str("response_body", safeBody).
				Msg("wildberries upstream request error status")
			if upstream.RetryableStatus(resp.StatusCode) && attempt < policy.MaxRetries {
				if waitErr := policy.SleepBackoff(ctx, attempt, upstream.ParseRetryAfter(resp)); waitErr != nil {
					return nil, waitErr
				}
				continue
			}
			return nil, lastErr
		}

		integrationlog.LogExternalCall(log.Debug().
			Int("http_status", resp.StatusCode).
			Dur("duration", duration).
			Str("date_from", dateFrom).
			Str("request_url", u.String()).
			Int("attempt", attempt), call).
			Msg("wildberries upstream request")

		rows, err := decodeSupplierStocksJSON(body)
		if err != nil {
			return nil, err
		}
		return rows, nil
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("wildberries statistics %s %s?dateFrom=%s: request failed", call.Method, call.FullURL(), url.QueryEscape(dateFrom))
}

// ParseStatisticsDateFrom нормализует dateFrom для WB (RFC3339 или YYYY-MM-DD). Пустая строка → полный охват с даты из документации WB.
func ParseStatisticsDateFrom(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "2020-11-15T00:00:00Z", nil
	}
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t.UTC().Format(time.RFC3339), nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC().Format(time.RFC3339), nil
	}
	if t, err := time.ParseInLocation("2006-01-02", s, time.UTC); err == nil {
		return t.UTC().Format(time.RFC3339), nil
	}
	if t, err := time.ParseInLocation("2006-01-02T15:04:05", s, time.UTC); err == nil {
		return t.UTC().Format(time.RFC3339), nil
	}
	return "", fmt.Errorf("invalid dateFrom %q", s)
}

// DedupeSupplierStocks оставляет последнюю запись по ключу (nmId, barcode, склад) по полю lastChangeDate (лексикографически для ISO).
func DedupeSupplierStocks(rows []SupplierStockRow) []SupplierStockRow {
	type key struct {
		nm int64
		bc string
		wh string
	}
	best := make(map[key]SupplierStockRow, len(rows))
	for _, r := range rows {
		k := key{r.NmID, r.Barcode, r.WarehouseName}
		prev, ok := best[k]
		if !ok || r.LastChangeDate > prev.LastChangeDate {
			best[k] = r
		}
	}
	out := make([]SupplierStockRow, 0, len(best))
	for _, v := range best {
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.SupplierArticle != b.SupplierArticle {
			return a.SupplierArticle < b.SupplierArticle
		}
		if a.WarehouseName != b.WarehouseName {
			return a.WarehouseName < b.WarehouseName
		}
		if a.NmID != b.NmID {
			return a.NmID < b.NmID
		}
		return a.Barcode < b.Barcode
	})
	return out
}

// SellableQuantity — количество для отображения: доступно к продаже, иначе полный остаток.
func SellableQuantity(r SupplierStockRow) int {
	if r.Quantity > 0 {
		return r.Quantity
	}
	if r.QuantityFull > 0 {
		return r.QuantityFull
	}
	return r.Quantity
}
