package dto

import "time"

type InventoryResponse struct {
	InventoryID    int        `json:"inventoryId"`
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       int        `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedBy      int        `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedBy      *int       `json:"updatedBy,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type InventoryCreateRequest struct {
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       int        `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
}

type InventoryUpdateRequest struct {
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       int        `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
}
