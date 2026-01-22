package dto

import "time"

type ProductCostResponse struct {
	CostID              string    `json:"costId"`
	ProductID           string    `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
	CreatedBy           *string  `json:"createdBy,omitempty"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedBy           *string  `json:"updatedBy,omitempty"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type ProductCostCreateRequest struct {
	ProductID           string    `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
}

type ProductCostUpdateRequest struct {
	ProductID           string    `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
}
