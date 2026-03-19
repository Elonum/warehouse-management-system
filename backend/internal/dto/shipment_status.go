package dto

type ShipmentStatusResponse struct {
	ShipmentStatusID string `json:"shipmentStatusId"`
	Name             string `json:"name"`
	IsFinal          bool   `json:"isFinal"`
}

type ShipmentStatusCreateRequest struct {
	Name string `json:"name"`
	IsFinal bool `json:"isFinal"`
}

type ShipmentStatusUpdateRequest struct {
	Name string `json:"name"`
	IsFinal bool `json:"isFinal"`
}
