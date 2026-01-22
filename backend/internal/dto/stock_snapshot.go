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
