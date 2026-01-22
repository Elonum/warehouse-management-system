package dto

type OrderStatusResponse struct {
	OrderStatusID string `json:"orderStatusId"`
	Name          string `json:"name"`
}

type OrderStatusCreateRequest struct {
	Name string `json:"name"`
}

type OrderStatusUpdateRequest struct {
	Name string `json:"name"`
}
