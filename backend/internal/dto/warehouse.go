package dto

type WarehouseResponse struct {
	WarehouseID    string  `json:"warehouseId"`
	Name           string  `json:"name"`
	IsMarketplace  bool    `json:"isMarketplace"`
	Location       *string `json:"location,omitempty"`
}

type WarehouseCreateRequest struct {
	Name          string  `json:"name"`
	IsMarketplace bool    `json:"isMarketplace"`
	Location      *string `json:"location,omitempty"`
}

type WarehouseUpdateRequest struct {
	Name          string  `json:"name"`
	IsMarketplace bool    `json:"isMarketplace"`
	Location      *string `json:"location,omitempty"`
}
