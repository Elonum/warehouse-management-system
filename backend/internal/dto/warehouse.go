package dto

type WarehouseResponse struct {
	WarehouseID     string  `json:"warehouseId"`
	Name            string  `json:"name"`
	WarehouseTypeID *string `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}

type WarehouseCreateRequest struct {
	Name            string  `json:"name"`
	WarehouseTypeID *string `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}

type WarehouseUpdateRequest struct {
	Name            string  `json:"name"`
	WarehouseTypeID *string `json:"warehouseTypeId,omitempty"`
	Location        *string `json:"location,omitempty"`
}
