package dto

import "time"

type ProductCostResponse struct {
	CostID              string     `json:"costId"`
	ProductID           string     `json:"productId"`
	PeriodStart         time.Time  `json:"periodStart"`
	PeriodEnd           *time.Time `json:"periodEnd,omitempty"`
	UnitCostToWarehouse float64    `json:"unitCostToWarehouse"`
	Notes               *string    `json:"notes,omitempty"`
	CreatedBy           *string    `json:"createdBy,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedBy           *string    `json:"updatedBy,omitempty"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

type ProductCostListItemResponse struct {
	CostID              string     `json:"costId"`
	ProductID           string     `json:"productId"`
	ProductArticle      string     `json:"productArticle,omitempty"`
	ProductBarcode      string     `json:"productBarcode,omitempty"`
	PeriodStart         time.Time  `json:"periodStart"`
	PeriodEnd           *time.Time `json:"periodEnd,omitempty"`
	UnitCostToWarehouse float64    `json:"unitCostToWarehouse"`
	IsActive            bool       `json:"isActive"`
	Notes               *string    `json:"notes,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

type ProductCostSummaryResponse struct {
	TotalRows   int `json:"totalRows"`
	ActiveRows  int `json:"activeRows"`
	ProductRows int `json:"productRows"`
}

type ProductCostListResponse struct {
	Items   []ProductCostListItemResponse `json:"items"`
	Summary ProductCostSummaryResponse    `json:"summary"`
}

type ProductCostCreateRequest struct {
	ProductID           string     `json:"productId"`
	PeriodStart         time.Time  `json:"periodStart"`
	PeriodEnd           *time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64    `json:"unitCostToWarehouse"`
	Notes               *string    `json:"notes,omitempty"`
	ClosePrevious       *bool      `json:"closePrevious,omitempty"`
}

type ProductCostUpdateRequest struct {
	ProductID           string     `json:"productId"`
	PeriodStart         time.Time  `json:"periodStart"`
	PeriodEnd           *time.Time `json:"periodEnd"`
	UnitCostToWarehouse float64    `json:"unitCostToWarehouse"`
	Notes               *string    `json:"notes,omitempty"`
}
