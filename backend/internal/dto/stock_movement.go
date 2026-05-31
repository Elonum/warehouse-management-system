package dto

import "time"

type StockMovementItemResponse struct {
	MovementDate    time.Time `json:"movementDate"`
	Quantity        int       `json:"quantity"`
	MovementType    string    `json:"movementType"`
	DocumentID      string    `json:"documentId"`
	DocumentNumber  string    `json:"documentNumber,omitempty"`
	ProductID       string    `json:"productId"`
	ProductArticle  string    `json:"productArticle,omitempty"`
	ProductBarcode  string    `json:"productBarcode,omitempty"`
	WarehouseID     string    `json:"warehouseId"`
	WarehouseName   string    `json:"warehouseName,omitempty"`
	IsMarketplaceWH bool      `json:"isMarketplaceWarehouse"`
}

type StockMovementSummaryResponse struct {
	TotalRows int `json:"totalRows"`
	TotalIn   int `json:"totalIn"`
	TotalOut  int `json:"totalOut"`
}

type StockMovementListResponse struct {
	Items   []StockMovementItemResponse  `json:"items"`
	Summary StockMovementSummaryResponse `json:"summary"`
}
