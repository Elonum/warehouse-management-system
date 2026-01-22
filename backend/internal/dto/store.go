package dto

type StoreResponse struct {
	StoreID string `json:"storeId"`
	Name    string `json:"name"`
}

type StoreCreateRequest struct {
	Name string `json:"name"`
}

type StoreUpdateRequest struct {
	Name string `json:"name"`
}
