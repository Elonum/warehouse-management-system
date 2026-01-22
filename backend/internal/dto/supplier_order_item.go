package dto

type SupplierOrderItemResponse struct {
	OrderItemID     string   `json:"orderItemId"`
	OrderID         string   `json:"orderId"`
	ProductID       string   `json:"productId"`
	WarehouseID     string   `json:"warehouseId"`
	OrderedQty      int      `json:"orderedQty"`
	ReceivedQty     int      `json:"receivedQty"`
	PurchasePrice   *float64 `json:"purchasePrice,omitempty"`
	TotalPrice      *float64 `json:"totalPrice,omitempty"`
	TotalWeight     int      `json:"totalWeight"`
	TotalLogistics  *float64 `json:"totalLogistics,omitempty"`
	UnitLogistics   *float64 `json:"unitLogistics,omitempty"`
	UnitSelfCost    *float64 `json:"unitSelfCost,omitempty"`
	TotalSelfCost   *float64 `json:"totalSelfCost,omitempty"`
	FulfillmentCost *float64 `json:"fulfillmentCost,omitempty"`
}

type SupplierOrderItemCreateRequest struct {
	OrderID         string   `json:"orderId"`
	ProductID       string   `json:"productId"`
	WarehouseID     string   `json:"warehouseId"`
	OrderedQty      int      `json:"orderedQty"`
	ReceivedQty     int      `json:"receivedQty"`
	PurchasePrice   *float64 `json:"purchasePrice,omitempty"`
	TotalPrice      *float64 `json:"totalPrice,omitempty"`
	TotalWeight     int      `json:"totalWeight"`
	TotalLogistics  *float64 `json:"totalLogistics,omitempty"`
	UnitLogistics   *float64 `json:"unitLogistics,omitempty"`
	UnitSelfCost    *float64 `json:"unitSelfCost,omitempty"`
	TotalSelfCost   *float64 `json:"totalSelfCost,omitempty"`
	FulfillmentCost *float64 `json:"fulfillmentCost,omitempty"`
}

type SupplierOrderItemUpdateRequest struct {
	OrderID         string   `json:"orderId"`
	ProductID       string   `json:"productId"`
	WarehouseID     string   `json:"warehouseId"`
	OrderedQty      int      `json:"orderedQty"`
	ReceivedQty     int      `json:"receivedQty"`
	PurchasePrice   *float64 `json:"purchasePrice,omitempty"`
	TotalPrice      *float64 `json:"totalPrice,omitempty"`
	TotalWeight     int      `json:"totalWeight"`
	TotalLogistics  *float64 `json:"totalLogistics,omitempty"`
	UnitLogistics   *float64 `json:"unitLogistics,omitempty"`
	UnitSelfCost    *float64 `json:"unitSelfCost,omitempty"`
	TotalSelfCost   *float64 `json:"totalSelfCost,omitempty"`
	FulfillmentCost *float64 `json:"fulfillmentCost,omitempty"`
}
