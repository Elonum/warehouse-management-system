package dto

type WarehouseResponse struct {
	WarehouseID     int     `json:"warehouseId"`
	Name            string  `json:"name"`
	WarehouseTypeID *int    `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}

type WarehouseCreateRequest struct {
	Name            string  `json:"name"`
	WarehouseTypeID *int    `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}

type WarehouseUpdateRequest struct {
	Name            string  `json:"name"`
	WarehouseTypeID *int    `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}
