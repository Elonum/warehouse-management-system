package dto

import "time"

type MpShipmentResponse struct {
	ShipmentID     int        `json:"shipmentId"`
	ShipmentDate   *time.Time `json:"shipmentDate,omitempty"`
	ShipmentNumber string     `json:"shipmentNumber"`
	StoreID        *int       `json:"storeId,omitempty"`
	WarehouseID    *int       `json:"warehouseId,omitempty"`
	StatusID       *int       `json:"statusId,omitempty"`
	LogisticsCost  *float64   `json:"logisticsCost,omitempty"`
	UnitLogistics  *float64   `json:"unitLogistics,omitempty"`
	AcceptanceCost *float64   `json:"acceptanceCost,omitempty"`
	AcceptanceDate *time.Time `json:"acceptanceDate,omitempty"`
	PositionsQty   int        `json:"positionsQty"`
	SentQty        int        `json:"sentQty"`
	AcceptedQty    int        `json:"acceptedQty"`
	CreatedBy      *int       `json:"createdBy,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedBy      *int       `json:"updatedBy,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type MpShipmentCreateRequest struct {
	ShipmentDate   *time.Time `json:"shipmentDate,omitempty"`
	ShipmentNumber string     `json:"shipmentNumber"`
	StoreID        *int       `json:"storeId,omitempty"`
	WarehouseID    *int       `json:"warehouseId,omitempty"`
	StatusID       *int       `json:"statusId,omitempty"`
	LogisticsCost  *float64   `json:"logisticsCost,omitempty"`
	UnitLogistics  *float64   `json:"unitLogistics,omitempty"`
	AcceptanceCost *float64   `json:"acceptanceCost,omitempty"`
	AcceptanceDate *time.Time `json:"acceptanceDate,omitempty"`
	PositionsQty   int        `json:"positionsQty"`
	SentQty        int        `json:"sentQty"`
	AcceptedQty    int        `json:"acceptedQty"`
}

type MpShipmentUpdateRequest struct {
	ShipmentDate   *time.Time `json:"shipmentDate,omitempty"`
	ShipmentNumber string     `json:"shipmentNumber"`
	StoreID        *int       `json:"storeId,omitempty"`
	WarehouseID    *int       `json:"warehouseId,omitempty"`
	StatusID       *int       `json:"statusId,omitempty"`
	LogisticsCost  *float64   `json:"logisticsCost,omitempty"`
	UnitLogistics  *float64   `json:"unitLogistics,omitempty"`
	AcceptanceCost *float64   `json:"acceptanceCost,omitempty"`
	AcceptanceDate *time.Time `json:"acceptanceDate,omitempty"`
	PositionsQty   int        `json:"positionsQty"`
	SentQty        int        `json:"sentQty"`
	AcceptedQty    int        `json:"acceptedQty"`
}
