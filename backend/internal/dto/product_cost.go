package dto

import "time"

type ProductCostResponse struct {
	CostID              int       `json:"costId"`
	ProductID           int       `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
	CreatedBy           *int      `json:"createdBy,omitempty"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedBy           *int      `json:"updatedBy,omitempty"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type ProductCostCreateRequest struct {
	ProductID           int       `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
}

type ProductCostUpdateRequest struct {
	ProductID           int       `json:"productId"`
	PeriodStart         time.Time `json:"periodStart"`
	PeriodEnd           time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64   `json:"unitCostToWarehouse"`
	Notes               *string   `json:"notes,omitempty"`
}
