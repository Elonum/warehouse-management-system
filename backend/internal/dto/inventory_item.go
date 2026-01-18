package dto

type InventoryItemResponse struct {
	InventoryItemID int     `json:"inventoryItemId"`
	InventoryID     int     `json:"inventoryId"`
	ProductID       *int    `json:"productId,omitempty"`
	WarehouseID     int     `json:"warehouseId"`
	ReceiptQty      int     `json:"receiptQty"`
	WriteOffQty     int     `json:"writeOffQty"`
	Reason          *string `json:"reason,omitempty"`
}

type InventoryItemCreateRequest struct {
	InventoryID int     `json:"inventoryId"`
	ProductID   *int    `json:"productId,omitempty"`
	WarehouseID int     `json:"warehouseId"`
	ReceiptQty  int     `json:"receiptQty"`
	WriteOffQty int     `json:"writeOffQty"`
	Reason      *string `json:"reason,omitempty"`
}

type InventoryItemUpdateRequest struct {
	InventoryID int     `json:"inventoryId"`
	ProductID   *int    `json:"productId,omitempty"`
	WarehouseID int     `json:"warehouseId"`
	ReceiptQty  int     `json:"receiptQty"`
	WriteOffQty int     `json:"writeOffQty"`
	Reason      *string `json:"reason,omitempty"`
}
