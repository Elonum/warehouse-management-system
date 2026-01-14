package dto

type MpShipmentItemResponse struct {
	ShipmentItemID   int      `json:"shipmentItemId"`
	ShipmentID       int      `json:"shipmentId"`
	ProductID        int      `json:"productId"`
	WarehouseID      int      `json:"warehouseId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
}

type MpShipmentItemCreateRequest struct {
	ShipmentID       int      `json:"shipmentId"`
	ProductID        int      `json:"productId"`
	WarehouseID      int      `json:"warehouseId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
}

type MpShipmentItemUpdateRequest struct {
	ShipmentID       int      `json:"shipmentId"`
	ProductID        int      `json:"productId"`
	WarehouseID      int      `json:"warehouseId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
}
