package dto

type ShipmentStatusResponse struct {
	ShipmentStatusID string `json:"shipmentStatusId"`
	Name             string `json:"name"`
}

type ShipmentStatusCreateRequest struct {
	Name string `json:"name"`
}

type ShipmentStatusUpdateRequest struct {
	Name string `json:"name"`
}
