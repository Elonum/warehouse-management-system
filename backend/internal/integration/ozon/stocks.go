package ozon

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

const (
	productListPageSize   = 1000
	analyticsSKUBatchSize = 500
	analyticsBatchDelay   = 250 * time.Millisecond
)

// CatalogSKU maps Ozon SKU to seller offer_id / product_id.
type CatalogSKU struct {
	SKU       int64
	ProductID int64
	OfferID   string
	Name      string
}

// StockRow is one normalized stock line for UI (SKU × warehouse/cluster).
type StockRow struct {
	SKU           int64
	ProductID     int64
	OfferID       string
	Name          string
	WarehouseName string
	Quantity      int
}

// FetchAllStockRows loads stocks via v1/analytics/stocks; falls back to v4/product/info/stocks.
func (c *Client) FetchAllStockRows(ctx context.Context) ([]StockRow, error) {
	if !c.configured() {
		return nil, ErrCredentialsMissing
	}
	catalog, err := c.fetchAllCatalogSKUs(ctx)
	if err != nil {
		return nil, err
	}
	if len(catalog) == 0 {
		return nil, nil
	}

	skuStrings := make([]string, 0, len(catalog))
	bySKU := make(map[int64]CatalogSKU, len(catalog))
	for _, row := range catalog {
		skuStrings = append(skuStrings, fmt.Sprintf("%d", row.SKU))
		bySKU[row.SKU] = row
	}

	rows, err := c.fetchAnalyticsStocksBatched(ctx, skuStrings, bySKU)
	if err == nil && len(rows) > 0 {
		return rows, nil
	}

	fallback, fbErr := c.fetchProductInfoStocks(ctx, bySKU)
	if fbErr != nil {
		if err != nil {
			return nil, fmt.Errorf("analytics stocks: %v; fallback v4/info/stocks: %w", err, fbErr)
		}
		return nil, fbErr
	}
	return fallback, nil
}

func (c *Client) fetchAllCatalogSKUs(ctx context.Context) ([]CatalogSKU, error) {
	var out []CatalogSKU
	lastID := ""
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		body := map[string]interface{}{
			"filter": map[string]string{
				"visibility": "ALL",
			},
			"last_id": lastID,
			"limit":   productListPageSize,
		}
		raw, _, err := c.postJSON(ctx, "/v3/product/list", body, 16<<20)
		if err != nil {
			return nil, fmt.Errorf("product/list: %w", err)
		}
		items, err := unwrapResultItems(raw)
		if err != nil {
			return nil, fmt.Errorf("product/list decode: %w", err)
		}
		for _, m := range items {
			sku := int64FromAny(m["sku"])
			if sku == 0 {
				continue
			}
			out = append(out, CatalogSKU{
				SKU:       sku,
				ProductID: int64FromAny(m["product_id"]),
				OfferID:   stringFromAny(m["offer_id"]),
				Name:      stringFromAny(m["name"]),
			})
		}
		if len(items) == 0 {
			break
		}
		nextLastID := resultLastID(raw)
		if nextLastID == "" || nextLastID == lastID {
			break
		}
		lastID = nextLastID
		if page > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(analyticsBatchDelay):
			}
		}
	}
	return out, nil
}

func resultLastID(raw []byte) string {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return ""
	}
	resultRaw, ok := top["result"]
	if !ok {
		return ""
	}
	var result map[string]interface{}
	if err := json.Unmarshal(resultRaw, &result); err != nil {
		return ""
	}
	return stringFromAny(result["last_id"])
}

func (c *Client) fetchAnalyticsStocksBatched(ctx context.Context, skus []string, bySKU map[int64]CatalogSKU) ([]StockRow, error) {
	var all []StockRow
	for i := 0; i < len(skus); i += analyticsSKUBatchSize {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if i > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(analyticsBatchDelay):
			}
		}
		end := i + analyticsSKUBatchSize
		if end > len(skus) {
			end = len(skus)
		}
		batch := skus[i:end]
		chunk, err := c.fetchAnalyticsStocksOnce(ctx, batch, bySKU)
		if err != nil {
			return all, err
		}
		all = append(all, chunk...)
	}
	return all, nil
}

func (c *Client) fetchAnalyticsStocksOnce(ctx context.Context, skus []string, bySKU map[int64]CatalogSKU) ([]StockRow, error) {
	attempts := []map[string]interface{}{
		{"skus": skus},
	}
	nums := make([]int64, 0, len(skus))
	for _, s := range skus {
		if n := int64FromAny(s); n > 0 {
			nums = append(nums, n)
		}
	}
	if len(nums) > 0 {
		attempts = append(attempts, map[string]interface{}{"skus": nums})
		attempts = append(attempts, map[string]interface{}{"sku": nums})
	}

	var lastErr error
	for _, body := range attempts {
		raw, _, err := c.postJSON(ctx, "/v1/analytics/stocks", body, 32<<20)
		if err != nil {
			lastErr = err
			continue
		}
		items, err := unwrapResultItems(raw)
		if err != nil {
			lastErr = err
			continue
		}
		rows := mapAnalyticsItems(items, bySKU)
		if len(rows) > 0 {
			return rows, nil
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, nil
}

func mapAnalyticsItems(items []map[string]interface{}, bySKU map[int64]CatalogSKU) []StockRow {
	out := make([]StockRow, 0, len(items))
	for _, m := range items {
		sku := int64FromAny(m["sku"])
		if sku == 0 {
			continue
		}
		cat := bySKU[sku]
		name := stringFromAny(m["name"])
		if name == "" {
			name = cat.Name
		}
		offerID := stringFromAny(m["offer_id"])
		if offerID == "" {
			offerID = cat.OfferID
		}
		wh := warehouseLabelFromMap(m)
		if wh == "" {
			wh = "Ozon"
		}
		out = append(out, StockRow{
			SKU:           sku,
			ProductID:     cat.ProductID,
			OfferID:       offerID,
			Name:          name,
			WarehouseName: wh,
			Quantity:      stockQtyFromMap(m),
		})
	}
	return out
}

func (c *Client) fetchProductInfoStocks(ctx context.Context, bySKU map[int64]CatalogSKU) ([]StockRow, error) {
	var out []StockRow
	cursor := ""
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		body := map[string]interface{}{
			"cursor": cursor,
			"filter": map[string]string{
				"visibility": "ALL",
			},
			"limit": productListPageSize,
		}
		raw, _, err := c.postJSON(ctx, "/v4/product/info/stocks", body, 32<<20)
		if err != nil {
			return nil, fmt.Errorf("product/info/stocks: %w", err)
		}
		items, err := unwrapResultItems(raw)
		if err != nil {
			return nil, err
		}
		for _, m := range items {
			offerID := stringFromAny(m["offer_id"])
			productID := int64FromAny(m["product_id"])
			stocksRaw, ok := m["stocks"]
			if !ok {
				continue
			}
			stocksList, ok := stocksRaw.([]interface{})
			if !ok {
				continue
			}
			for _, st := range stocksList {
				sm, ok := st.(map[string]interface{})
				if !ok {
					continue
				}
				sku := int64FromAny(sm["sku"])
				if sku == 0 {
					sku = int64FromAny(m["sku"])
				}
				cat := bySKU[sku]
				wh := stringFromAny(sm["type"])
				if wh == "" {
					wh = "Ozon"
				}
				qty := stockQtyFromMap(sm)
				if qty == 0 {
					qty = intFromAny(sm["present"])
				}
				name := cat.Name
				if offerID == "" {
					offerID = cat.OfferID
				}
				if productID == 0 {
					productID = cat.ProductID
				}
				out = append(out, StockRow{
					SKU:           sku,
					ProductID:     productID,
					OfferID:       offerID,
					Name:          name,
					WarehouseName: wh,
					Quantity:      qty,
				})
			}
		}
		if len(items) == 0 {
			break
		}
		nextCursor := ""
		var top map[string]json.RawMessage
		if json.Unmarshal(raw, &top) == nil {
			if resultRaw, ok := top["result"]; ok {
				var result map[string]interface{}
				if json.Unmarshal(resultRaw, &result) == nil {
					nextCursor = stringFromAny(result["cursor"])
				}
			}
		}
		if nextCursor == "" || nextCursor == cursor {
			break
		}
		cursor = nextCursor
		if page > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(analyticsBatchDelay):
			}
		}
	}
	return out, nil
}
