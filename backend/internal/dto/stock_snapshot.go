package dto

import "time"

type StockSnapshotResponse struct {
	SnapshotID   string    `json:"snapshotId"`
	ProductID    string    `json:"productId"`
	WarehouseID  string    `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
	CreatedBy    *string   `json:"createdBy,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type StockSnapshotCreateRequest struct {
	ProductID    string    `json:"productId"`
	WarehouseID  string    `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
}

type StockSnapshotUpdateRequest struct {
	ProductID    string    `json:"productId"`
	WarehouseID  string    `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
}

type StockSnapshotListItemResponse struct {
	SnapshotID        string    `json:"snapshotId"`
	ProductID         string    `json:"productId"`
	ProductArticle    string    `json:"productArticle,omitempty"`
	ProductBarcode    string    `json:"productBarcode,omitempty"`
	WarehouseID       string    `json:"warehouseId"`
	WarehouseName     string    `json:"warehouseName,omitempty"`
	IsMarketplaceWH   bool      `json:"isMarketplaceWarehouse"`
	SnapshotDate      time.Time `json:"snapshotDate"`
	Quantity          int       `json:"quantity"`
	IsLatestForPair   bool      `json:"isLatestForPair"`
	CreatedBy         *string   `json:"createdBy,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
}

type StockSnapshotSummaryResponse struct {
	TotalRows    int        `json:"totalRows"`
	UniquePairs  int        `json:"uniquePairs"`
	EarliestDate *time.Time `json:"earliestDate,omitempty"`
	LatestDate   *time.Time `json:"latestDate,omitempty"`
}

type StockSnapshotListResponse struct {
	Items   []StockSnapshotListItemResponse `json:"items"`
	Summary StockSnapshotSummaryResponse    `json:"summary"`
}
