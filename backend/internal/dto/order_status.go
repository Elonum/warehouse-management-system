package dto

type OrderStatusResponse struct {
	OrderStatusID string `json:"orderStatusId"`
	Name          string `json:"name"`
	IsFinal       bool   `json:"isFinal"`
}

type OrderStatusCreateRequest struct {
	Name    string `json:"name"`
	IsFinal bool   `json:"isFinal"`
}

type OrderStatusUpdateRequest struct {
	Name    string `json:"name"`
	IsFinal bool   `json:"isFinal"`
}
