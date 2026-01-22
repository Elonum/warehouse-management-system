package dto

type StockItemResponse struct {
	ProductID       string `json:"productId"`
	WarehouseID     string `json:"warehouseId"`
	CurrentQuantity int    `json:"currentQuantity"`
}
