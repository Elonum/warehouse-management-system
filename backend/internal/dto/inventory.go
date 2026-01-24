package dto

import "time"

type InventoryResponse struct {
	InventoryID    string     `json:"inventoryId"`
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       string     `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedBy      string     `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedBy      *string    `json:"updatedBy,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	TotalReceiptQty int       `json:"totalReceiptQty,omitempty"` // Total receipt quantity from all items
	TotalWriteOffQty int      `json:"totalWriteOffQty,omitempty"` // Total write-off quantity from all items
}

type InventoryCreateRequest struct {
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       string     `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
}

type InventoryUpdateRequest struct {
	AdjustmentDate *time.Time `json:"adjustmentDate,omitempty"`
	StatusID       string     `json:"statusId"`
	Notes          *string    `json:"notes,omitempty"`
}
