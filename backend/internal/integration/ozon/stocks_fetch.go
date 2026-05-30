package ozon

import (
	"context"
	"fmt"
)

// FetchAllStockRows loads marketplace stock rows using Ozon Seller API (no DB).
func (c *Client) FetchAllStockRows(ctx context.Context) (rows []StockRow, meta FetchMeta, err error) {
	if !c.configured() {
		return nil, meta, ErrCredentialsMissing
	}

	rows, stat, err := c.fetchProductInfoStocks(ctx)
	meta.record("v4/product/info/stocks", stat, err)
	if err == nil && len(rows) > 0 {
		meta.Source = "v4/product/info/stocks"
		return rows, meta, nil
	}

	rows, stat, err = c.fetchStockOnWarehousesV2(ctx)
	meta.record("v2/analytics/stock_on_warehouses", stat, err)
	if err == nil && len(rows) > 0 {
		meta.Source = "v2/analytics/stock_on_warehouses"
		return rows, meta, nil
	}

	rows, stat, err = c.fetchStocksViaProductInfoList(ctx)
	meta.record("v3/product/info/list", stat, err)
	if err == nil && len(rows) > 0 {
		meta.Source = "v3/product/info/list"
		return rows, meta, nil
	}

	catalog, stat, err := c.fetchCatalogWithSKUs(ctx)
	meta.record("v3/product/list+info/list (catalog)", stat, err)
	if err != nil {
		return nil, meta, fmt.Errorf("catalog: %w", err)
	}
	if len(catalog) == 0 {
		return nil, meta, fmt.Errorf("ozon: empty product catalog (%s)", meta.Summary())
	}

	bySKU := make(map[int64]CatalogSKU, len(catalog))
	skuStrings := make([]string, 0, len(catalog))
	for _, row := range catalog {
		if row.SKU == 0 {
			continue
		}
		bySKU[row.SKU] = row
		skuStrings = append(skuStrings, fmt.Sprintf("%d", row.SKU))
	}
	if len(skuStrings) == 0 {
		return nil, meta, fmt.Errorf("ozon: catalog has no SKU ids (%s)", meta.Summary())
	}

	rows, stat, err = c.fetchAnalyticsStocksBatched(ctx, skuStrings, bySKU)
	meta.record("v1/analytics/stocks", stat, err)
	if err != nil {
		return nil, meta, fmt.Errorf("ozon: all stock sources failed (%s)", meta.Summary())
	}
	if len(rows) == 0 {
		return nil, meta, fmt.Errorf("ozon: no stock rows after all sources (%s)", meta.Summary())
	}
	meta.Source = "v1/analytics/stocks"
	return rows, meta, nil
}

// fetchStockOnWarehousesV2 — POST /v2/analytics/stock_on_warehouses (FBO/FBS отчёт по складам).
func (c *Client) fetchStockOnWarehousesV2(ctx context.Context) ([]StockRow, stageStat, error) {
	var out []StockRow
	stat := stageStat{}
	offset := int64(0)
	const pageLimit int64 = 1000
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, stat, err
		}
		if page > 0 {
			sleepBatch(ctx, analyticsBatchDelay)
		}
		body := map[string]interface{}{
			"limit":          pageLimit,
			"offset":         offset,
			"warehouse_type": "ALL",
		}
		raw, _, err := c.postJSON(ctx, "/v2/analytics/stock_on_warehouses", body, 32<<20)
		if err != nil {
			return out, stat, err
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			return out, stat, err
		}
		stat.apiItems += len(payload.Items)
		for _, m := range payload.Items {
			sku := int64FromAny(m["sku"])
			if sku == 0 {
				sku = int64FromAny(m["item_sku"])
			}
			if sku == 0 {
				continue
			}
			wh := warehouseLabelFromMap(m)
			if wh == "" {
				wh = stringFromAny(m["warehouse_name"])
			}
			if wh == "" {
				wh = "Ozon"
			}
			name := stringFromAny(m["item_name"])
			if name == "" {
				name = stringFromAny(m["name"])
			}
			offerID := stringFromAny(m["offer_id"])
			qty := stockQtyFromMap(m)
			if qty == 0 {
				qty = intFromAny(m["free_to_sell_amount"])
			}
			out = append(out, StockRow{
				SKU:           sku,
				OfferID:       offerID,
				Name:          name,
				WarehouseName: wh,
				Quantity:      qty,
			})
		}
		stat.parsedRows = len(out)
		if len(payload.Items) == 0 {
			break
		}
		if int64(len(payload.Items)) < pageLimit {
			break
		}
		offset += pageLimit
	}
	return out, stat, nil
}

func (c *Client) fetchProductInfoStocks(ctx context.Context) ([]StockRow, stageStat, error) {
	var out []StockRow
	stat := stageStat{}
	cursor := ""
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, stat, err
		}
		if page > 0 {
			sleepBatch(ctx, analyticsBatchDelay)
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
			return out, stat, fmt.Errorf("product/info/stocks: %w", err)
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			return out, stat, err
		}
		stat.apiItems += len(payload.Items)
		for _, m := range payload.Items {
			offerID := stringFromAny(m["offer_id"])
			productID := int64FromAny(m["product_id"])
			name := stringFromAny(m["name"])
			for _, st := range mapInterfaceSlice(m["stocks"]) {
				sku := int64FromAny(st["sku"])
				if sku == 0 {
					sku = int64FromAny(m["sku"])
				}
				wh := warehouseLabelFromMap(st)
				if wh == "" {
					wh = "Ozon"
				}
				qty := intFromAny(st["present"])
				if qty == 0 {
					qty = stockQtyFromMap(st)
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
		stat.parsedRows = len(out)
		if len(payload.Items) == 0 {
			break
		}
		nextCursor := payload.Cursor
		if nextCursor == "" || nextCursor == cursor {
			break
		}
		cursor = nextCursor
	}
	return out, stat, nil
}

func (c *Client) fetchStocksViaProductInfoList(ctx context.Context) ([]StockRow, stageStat, error) {
	productIDs, stat, err := c.fetchAllProductIDs(ctx)
	if err != nil {
		return nil, stat, err
	}
	if len(productIDs) == 0 {
		stat.detail = "product_ids=0"
		return nil, stat, nil
	}
	stat.detail = fmt.Sprintf("product_ids=%d", len(productIDs))

	var out []StockRow
	for i := 0; i < len(productIDs); i += infoListBatchSize {
		if err := ctx.Err(); err != nil {
			return out, stat, err
		}
		if i > 0 {
			sleepBatch(ctx, analyticsBatchDelay)
		}
		end := i + infoListBatchSize
		if end > len(productIDs) {
			end = len(productIDs)
		}
		batch := productIDs[i:end]
		body := map[string]interface{}{
			"product_id": batch,
		}
		raw, _, err := c.postJSON(ctx, "/v3/product/info/list", body, 16<<20)
		if err != nil {
			return out, stat, fmt.Errorf("product/info/list: %w", err)
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			return out, stat, err
		}
		stat.apiItems += len(payload.Items)
		for _, m := range payload.Items {
			chunk := stockRowsFromProductInfoItem(m)
			out = append(out, chunk...)
		}
	}
	stat.parsedRows = len(out)
	return out, stat, nil
}
