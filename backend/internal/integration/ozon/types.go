package ozon

import "time"

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
