package dto

type WarehouseTypeResponse struct {
	WarehouseTypeID int    `json:"warehouseTypeId"`
	Name            string `json:"name"`
}

type WarehouseTypeCreateRequest struct {
	Name string `json:"name"`
}

type WarehouseTypeUpdateRequest struct {
	Name string `json:"name"`
}
