package ozon

import (
	"context"
	"errors"
	"fmt"
)

var ErrOzonStocksEmpty = errors.New("ozon returned zero stock rows")

var analyticsStocksBodyIndex = -1

func (c *Client) fetchAnalyticsStocksBatched(ctx context.Context, skus []string, bySKU map[int64]CatalogSKU) ([]StockRow, stageStat, error) {
	stat := stageStat{detail: fmt.Sprintf("skus=%d", len(skus))}
	var all []StockRow
	for i := 0; i < len(skus); i += analyticsSKUBatchSize {
		if err := ctx.Err(); err != nil {
			return all, stat, err
		}
		end := i + analyticsSKUBatchSize
		if end > len(skus) {
			end = len(skus)
		}
		batch := skus[i:end]
		chunk, batchStat, err := c.fetchAnalyticsStocksOnce(ctx, batch, bySKU)
		stat.apiItems += batchStat.apiItems
		if err != nil {
			stat.parsedRows = len(all)
			return all, stat, err
		}
		all = append(all, chunk...)
	}
	stat.parsedRows = len(all)
	return all, stat, nil
}

func (c *Client) fetchAnalyticsStocksOnce(ctx context.Context, skus []string, bySKU map[int64]CatalogSKU) ([]StockRow, stageStat, error) {
	stat := stageStat{}
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
	tryOrder := make([]int, 0, len(attempts))
	if analyticsStocksBodyIndex >= 0 && analyticsStocksBodyIndex < len(attempts) {
		tryOrder = append(tryOrder, analyticsStocksBodyIndex)
	}
	for i := range attempts {
		if analyticsStocksBodyIndex >= 0 && i == analyticsStocksBodyIndex {
			continue
		}
		tryOrder = append(tryOrder, i)
	}

	for _, idx := range tryOrder {
		body := attempts[idx]
		raw, _, err := c.postJSON(ctx, "/v1/analytics/stocks", body, 32<<20)
		if err != nil {
			lastErr = err
			continue
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			lastErr = err
			continue
		}
		stat.apiItems += len(payload.Items)
		rows := mapAnalyticsItems(payload.Items, bySKU)
		if len(rows) > 0 {
			analyticsStocksBodyIndex = idx
			stat.parsedRows = len(rows)
			return rows, stat, nil
		}
	}
	if lastErr != nil {
		return nil, stat, lastErr
	}
	return nil, stat, nil
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
