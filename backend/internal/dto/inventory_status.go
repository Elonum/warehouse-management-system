package dto

type InventoryStatusResponse struct {
	InventoryStatusID string `json:"inventoryStatusId"`
	Name              string `json:"name"`
}

type InventoryStatusCreateRequest struct {
	Name string `json:"name"`
}

type InventoryStatusUpdateRequest struct {
	Name string `json:"name"`
}
