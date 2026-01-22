package dto

import "time"

type SupplierOrderResponse struct {
	OrderID             string     `json:"orderId"`
	OrderNumber         string     `json:"orderNumber"`
	Buyer               *string    `json:"buyer,omitempty"`
	StatusID            *string    `json:"statusId,omitempty"`
	PurchaseDate        *time.Time `json:"purchaseDate,omitempty"`
	PlannedReceiptDate  *time.Time `json:"plannedReceiptDate,omitempty"`
	ActualReceiptDate   *time.Time `json:"actualReceiptDate,omitempty"`
	LogisticsChinaMsk   *float64   `json:"logisticsChinaMsk,omitempty"`
	LogisticsMskKzn     *float64   `json:"logisticsMskKzn,omitempty"`
	LogisticsAdditional *float64   `json:"logisticsAdditional,omitempty"`
	LogisticsTotal      *float64   `json:"logisticsTotal,omitempty"`
	OrderItemCost       *float64   `json:"orderItemCost,omitempty"`
	PositionsQty        int        `json:"positionsQty"`
	TotalQty            int        `json:"totalQty"`
	OrderItemWeight     *float64   `json:"orderItemWeight,omitempty"`
	ParentOrderID       *string    `json:"parentOrderId,omitempty"`
	CreatedBy           *string    `json:"createdBy,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedBy           *string    `json:"updatedBy,omitempty"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

type SupplierOrderCreateRequest struct {
	OrderNumber         string     `json:"orderNumber"`
	Buyer               *string    `json:"buyer,omitempty"`
	StatusID            *string    `json:"statusId,omitempty"`
	PurchaseDate        *time.Time `json:"purchaseDate,omitempty"`
	PlannedReceiptDate  *time.Time `json:"plannedReceiptDate,omitempty"`
	ActualReceiptDate   *time.Time `json:"actualReceiptDate,omitempty"`
	LogisticsChinaMsk   *float64   `json:"logisticsChinaMsk,omitempty"`
	LogisticsMskKzn     *float64   `json:"logisticsMskKzn,omitempty"`
	LogisticsAdditional *float64   `json:"logisticsAdditional,omitempty"`
	LogisticsTotal      *float64   `json:"logisticsTotal,omitempty"`
	OrderItemCost       *float64   `json:"orderItemCost,omitempty"`
	PositionsQty        int        `json:"positionsQty"`
	TotalQty            int        `json:"totalQty"`
	OrderItemWeight     *float64   `json:"orderItemWeight,omitempty"`
	ParentOrderID       *string    `json:"parentOrderId,omitempty"`
}

type SupplierOrderUpdateRequest struct {
	OrderNumber         string     `json:"orderNumber"`
	Buyer               *string    `json:"buyer,omitempty"`
	StatusID            *string    `json:"statusId,omitempty"`
	PurchaseDate        *time.Time `json:"purchaseDate,omitempty"`
	PlannedReceiptDate  *time.Time `json:"plannedReceiptDate,omitempty"`
	ActualReceiptDate   *time.Time `json:"actualReceiptDate,omitempty"`
	LogisticsChinaMsk   *float64   `json:"logisticsChinaMsk,omitempty"`
	LogisticsMskKzn     *float64   `json:"logisticsMskKzn,omitempty"`
	LogisticsAdditional *float64   `json:"logisticsAdditional,omitempty"`
	LogisticsTotal      *float64   `json:"logisticsTotal,omitempty"`
	OrderItemCost       *float64   `json:"orderItemCost,omitempty"`
	PositionsQty        int        `json:"positionsQty"`
	TotalQty            int        `json:"totalQty"`
	OrderItemWeight     *float64   `json:"orderItemWeight,omitempty"`
	ParentOrderID       *string    `json:"parentOrderId,omitempty"`
}
