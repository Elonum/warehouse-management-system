package dto

type StockItemResponse struct {
	ProductID       int `json:"productId"`
	WarehouseID     int `json:"warehouseId"`
	CurrentQuantity int `json:"currentQuantity"`
}
