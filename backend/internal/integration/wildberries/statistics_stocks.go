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
)

const (
	statisticsHTTPTimeout = 120 * time.Second
	// WB Statistics: максимум строк за один запрос; дальше сдвигают dateFrom по lastChangeDate последней записи.
	supplierStocksMaxRowsPerRequest = 60_000
	// Пауза между страницами: песочница ~1 rps; в бою снижает риск 429.
	supplierStocksPageDelay = 400 * time.Millisecond
)

// StatisticsClient вызывает Statistics API WB (остатки, отчёты). Токен — отдельная категория в кабинете («Статистика»).
type StatisticsClient struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func NewStatisticsClient(baseURL, token string) *StatisticsClient {
	return &StatisticsClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		httpClient: &http.Client{
			Timeout: statisticsHTTPTimeout,
		},
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
		if page > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(supplierStocksPageDelay):
			}
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

func (c *StatisticsClient) fetchSupplierStocksPage(ctx context.Context, dateFrom string) ([]SupplierStockRow, error) {
	u, err := url.Parse(c.baseURL + "/api/v1/supplier/stocks")
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("dateFrom", dateFrom)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wildberries statistics GET /supplier/stocks: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	rows, err := decodeSupplierStocksJSON(body)
	if err != nil {
		return nil, err
	}
	return rows, nil
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
