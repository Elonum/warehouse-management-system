package dto

type WarehouseTypeResponse struct {
	WarehouseTypeID string `json:"warehouseTypeId"`
	Name            string `json:"name"`
	IsMarketplace   bool   `json:"isMarketplace"`
}

type WarehouseTypeCreateRequest struct {
	Name          string `json:"name"`
	IsMarketplace bool   `json:"isMarketplace"`
}

type WarehouseTypeUpdateRequest struct {
	Name          string `json:"name"`
	IsMarketplace bool   `json:"isMarketplace"`
}
