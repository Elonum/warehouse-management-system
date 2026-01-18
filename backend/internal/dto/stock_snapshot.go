package dto

import "time"

type StockSnapshotResponse struct {
	SnapshotID   int       `json:"snapshotId"`
	ProductID    int       `json:"productId"`
	WarehouseID  int       `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
	CreatedBy    *int      `json:"createdBy,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type StockSnapshotCreateRequest struct {
	ProductID    int       `json:"productId"`
	WarehouseID  int       `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
}

type StockSnapshotUpdateRequest struct {
	ProductID    int       `json:"productId"`
	WarehouseID  int       `json:"warehouseId"`
	SnapshotDate time.Time `json:"snapshotDate"`
	Quantity     int       `json:"quantity"`
}
