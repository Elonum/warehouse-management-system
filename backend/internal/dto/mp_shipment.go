package dto

import "time"

type MpShipmentResponse struct {
	ShipmentID     string     `json:"shipmentId"`
	ShipmentDate   *time.Time `json:"shipmentDate,omitempty"`
	ShipmentNumber string     `json:"shipmentNumber"`
	StoreID        *string    `json:"storeId,omitempty"`
	WarehouseID    *string    `json:"warehouseId,omitempty"`
	StatusID       *string    `json:"statusId,omitempty"`
	LogisticsCost  *float64   `json:"logisticsCost,omitempty"`
	UnitLogistics  *float64   `json:"unitLogistics,omitempty"`
	AcceptanceCost *float64   `json:"acceptanceCost,omitempty"`
	AcceptanceDate *time.Time `json:"acceptanceDate,omitempty"`
	PositionsQty   int        `json:"positionsQty"`
	SentQty        int        `json:"sentQty"`
	AcceptedQty    int        `json:"acceptedQty"`
	CreatedBy      *string    `json:"createdBy,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedBy      *string    `json:"updatedBy,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type MpShipmentCreateRequest struct {
	ShipmentDate   *time.Time `json:"shipmentDate,omitempty"`
	ShipmentNumber string     `json:"shipmentNumber"`
	StoreID        *string    `json:"storeId,omitempty"`
	WarehouseID    *string    `json:"warehouseId,omitempty"`
	StatusID       *string    `json:"statusId,omitempty"`
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
	StoreID        *string    `json:"storeId,omitempty"`
	WarehouseID    *string    `json:"warehouseId,omitempty"`
	StatusID       *string    `json:"statusId,omitempty"`
	LogisticsCost  *float64   `json:"logisticsCost,omitempty"`
	UnitLogistics  *float64   `json:"unitLogistics,omitempty"`
	AcceptanceCost *float64   `json:"acceptanceCost,omitempty"`
	AcceptanceDate *time.Time `json:"acceptanceDate,omitempty"`
	PositionsQty   int        `json:"positionsQty"`
	SentQty        int        `json:"sentQty"`
	AcceptedQty    int        `json:"acceptedQty"`
}
