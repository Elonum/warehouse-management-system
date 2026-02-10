package dto

type InventoryStatusResponse struct {
	InventoryStatusID string `json:"inventoryStatusId"`
	Name              string `json:"name"`
	IsFinal           bool   `json:"isFinal"`
}

type InventoryStatusCreateRequest struct {
	Name    string `json:"name"`
	IsFinal bool   `json:"isFinal"`
}

type InventoryStatusUpdateRequest struct {
	Name    string `json:"name"`
	IsFinal bool   `json:"isFinal"`
}
