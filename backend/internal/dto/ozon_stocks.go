package dto

// OzonStockListRequest — тело POST /integrations/ozon/stocks/list (пока без параметров).
type OzonStockListRequest struct{}

// OzonStockListResponse — нормализованные остатки Ozon для UI.
type OzonStockListResponse struct {
	Items []OzonStockItem `json:"items"`
	Total int             `json:"total"`
}

// OzonStockItem совместим с marketplaceStockAdapter.
type OzonStockItem struct {
	Sku           int64  `json:"sku"`
	ProductID     int64  `json:"productId,omitempty"`
	OfferID       string `json:"offerId"`
	Article       string `json:"article"`
	Name          string `json:"name,omitempty"`
	Barcode       string `json:"barcode,omitempty"`
	WarehouseName string `json:"warehouseName"`
	Quantity      int    `json:"quantity"`
}
