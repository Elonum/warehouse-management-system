package dto

type InventoryItemResponse struct {
	InventoryItemID string  `json:"inventoryItemId"`
	InventoryID     string  `json:"inventoryId"`
	ProductID       *string `json:"productId,omitempty"`
	WarehouseID     string  `json:"warehouseId"`
	ReceiptQty      int     `json:"receiptQty"`
	WriteOffQty     int     `json:"writeOffQty"`
	Reason          *string `json:"reason,omitempty"`
}

type InventoryItemCreateRequest struct {
	InventoryID string  `json:"inventoryId"`
	ProductID   *string `json:"productId,omitempty"`
	WarehouseID string  `json:"warehouseId"`
	ReceiptQty  int     `json:"receiptQty"`
	WriteOffQty int     `json:"writeOffQty"`
	Reason      *string `json:"reason,omitempty"`
}

type InventoryItemUpdateRequest struct {
	InventoryID string  `json:"inventoryId"`
	ProductID   *string `json:"productId,omitempty"`
	WarehouseID string  `json:"warehouseId"`
	ReceiptQty  int     `json:"receiptQty"`
	WriteOffQty int     `json:"writeOffQty"`
	Reason      *string `json:"reason,omitempty"`
}
