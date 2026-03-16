package dto

type MpShipmentItemResponse struct {
	ShipmentItemID   string   `json:"shipmentItemId"`
	ShipmentID       string   `json:"shipmentId"`
	ProductID        string   `json:"productId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
	TotalLogisticsForItem *float64 `json:"totalLogisticsForItem,omitempty"`
}

type MpShipmentItemCreateRequest struct {
	ShipmentID       string   `json:"shipmentId"`
	ProductID        string   `json:"productId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
	TotalLogisticsForItem *float64 `json:"totalLogisticsForItem,omitempty"`
}

type MpShipmentItemUpdateRequest struct {
	ShipmentID       string   `json:"shipmentId"`
	ProductID        string   `json:"productId"`
	SentQty          int      `json:"sentQty"`
	AcceptedQty      int      `json:"acceptedQty"`
	LogisticsForItem *float64 `json:"logisticsForItem,omitempty"`
	TotalLogisticsForItem *float64 `json:"totalLogisticsForItem,omitempty"`
}
