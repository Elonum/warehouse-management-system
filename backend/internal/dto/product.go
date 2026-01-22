package dto

type ProductResponse struct {
	ProductID  string   `json:"productId"`
	Article    string   `json:"article"`
	Barcode    string   `json:"barcode"`
	UnitWeight int      `json:"unitWeight"`
	UnitCost   *float64 `json:"unitCost,omitempty"`
}

type ProductCreateRequest struct {
	Article    string   `json:"article"`
	Barcode    string   `json:"barcode"`
	UnitWeight int      `json:"unitWeight"`
	UnitCost   *float64 `json:"unitCost,omitempty"`
}

type ProductUpdateRequest struct {
	Article    string   `json:"article"`
	Barcode    string   `json:"barcode"`
	UnitWeight int      `json:"unitWeight"`
	UnitCost   *float64 `json:"unitCost,omitempty"`
}
