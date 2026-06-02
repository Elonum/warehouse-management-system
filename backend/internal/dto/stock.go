package dto

type StockItemResponse struct {
	ProductID       string   `json:"productId"`
	WarehouseID     string   `json:"warehouseId"`
	ProductArticle  string   `json:"productArticle,omitempty"`
	ProductBarcode  string   `json:"productBarcode,omitempty"`
	CurrentQuantity int      `json:"currentQuantity"`
	ReorderPoint    int      `json:"reorderPoint"`
	UnitCost        *float64 `json:"unitCost,omitempty"`
	StockValue      *float64 `json:"stockValue,omitempty"`
	HasUnitCost     bool     `json:"hasUnitCost"`
}

type StockCurrentSummaryResponse struct {
	TotalStockValue   float64 `json:"totalStockValue"`
	RowsMissingCost   int     `json:"rowsMissingCost"`
	RowsWithCost      int     `json:"rowsWithCost"`
	TotalRows         int     `json:"totalRows"`
}

type StockCurrentListResponse struct {
	Items   []StockItemResponse         `json:"items"`
	Summary StockCurrentSummaryResponse `json:"summary"`
}
