package dto

// WildberriesStockListRequest — тело POST /integrations/wildberries/stocks/list.
type WildberriesStockListRequest struct {
	// DateFrom — RFC3339 или YYYY-MM-DD; пусто = 2020-11-15 (как в документации WB Statistics).
	DateFrom string `json:"dateFrom"`
}

// WildberriesStockListResponse — нормализованные остатки для UI.
type WildberriesStockListResponse struct {
	Items []WildberriesStockItem `json:"items"`
	Total int                    `json:"total"`
}

// WildberriesStockItem совместим с marketplaceStockAdapter (nmId, article, barcode, warehouseName, quantity).
type WildberriesStockItem struct {
	NmID            int64  `json:"nmId"`
	SupplierArticle string `json:"supplierArticle"`
	Article         string `json:"article"`
	Barcode         string `json:"barcode"`
	WarehouseName   string `json:"warehouseName"`
	Quantity        int    `json:"quantity"`
	TechSize        string `json:"techSize,omitempty"`
	LastChangeDate  string `json:"lastChangeDate,omitempty"`
}
