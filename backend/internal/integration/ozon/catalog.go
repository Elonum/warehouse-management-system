package ozon

import (
	"context"
	"fmt"
	"time"
)

const infoListBatchSize = 1000

func (c *Client) fetchCatalogWithSKUs(ctx context.Context) ([]CatalogSKU, stageStat, error) {
	productIDs, stat, err := c.fetchAllProductIDs(ctx)
	if err != nil {
		return nil, stat, err
	}
	if len(productIDs) == 0 {
		stat.detail = "product_ids=0"
		return nil, stat, nil
	}
	stat.detail = fmt.Sprintf("product_ids=%d", len(productIDs))
	catalog, err := c.fetchProductInfoByIDs(ctx, productIDs)
	if err != nil {
		return nil, stat, err
	}
	stat.parsedRows = len(catalog)
	return catalog, stat, err
}

func (c *Client) fetchAllProductIDs(ctx context.Context) ([]int64, stageStat, error) {
	stat := stageStat{}
	var ids []int64
	lastID := ""
	for page := 0; page < 500; page++ {
		if err := ctx.Err(); err != nil {
			return nil, stat, err
		}
		if page > 0 {
			sleepBatch(ctx, analyticsBatchDelay)
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
			return nil, stat, fmt.Errorf("product/list: %w", err)
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			return nil, stat, fmt.Errorf("product/list decode: %w", err)
		}
		stat.apiItems += len(payload.Items)
		for _, m := range payload.Items {
			id := int64FromAny(m["product_id"])
			if id == 0 {
				id = int64FromAny(m["id"])
			}
			if id > 0 {
				ids = append(ids, id)
			}
		}
		if len(payload.Items) == 0 {
			break
		}
		nextLastID := payload.LastID
		if nextLastID == "" {
			nextLastID = payload.Cursor
		}
		if nextLastID == "" || nextLastID == lastID {
			break
		}
		lastID = nextLastID
	}
	stat.parsedRows = len(ids)
	return ids, stat, nil
}

func (c *Client) fetchProductInfoByIDs(ctx context.Context, productIDs []int64) ([]CatalogSKU, error) {
	var out []CatalogSKU
	seen := make(map[int64]CatalogSKU)
	for i := 0; i < len(productIDs); i += infoListBatchSize {
		if err := ctx.Err(); err != nil {
			return nil, err
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
			return nil, fmt.Errorf("product/info/list: %w", err)
		}
		payload, err := unwrapOzonPagedPayload(raw)
		if err != nil {
			return nil, fmt.Errorf("product/info/list decode: %w", err)
		}
		for _, m := range payload.Items {
			offerID := stringFromAny(m["offer_id"])
			if offerID == "" {
				offerID = stringFromAny(m["offerId"])
			}
			name := stringFromAny(m["name"])
			productID := int64FromAny(m["id"])
			if productID == 0 {
				productID = int64FromAny(m["product_id"])
			}
			for _, sku := range skusFromProductInfoItem(m) {
				row := CatalogSKU{
					SKU:       sku,
					ProductID: productID,
					OfferID:   offerID,
					Name:      name,
				}
				seen[sku] = row
			}
		}
	}
	out = make([]CatalogSKU, 0, len(seen))
	for _, row := range seen {
		out = append(out, row)
	}
	return out, nil
}

func sleepBatch(ctx context.Context, d time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}
