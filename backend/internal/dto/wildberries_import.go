package dto

type WildberriesImportPreviewRequest struct {
	SupplyID     int64  `json:"supplyId"`
	MatchBy      string `json:"matchBy"` // "barcode" | "vendor_code"
	IsPreorderID bool   `json:"isPreorderID"`
}

type WildberriesSupplySummary struct {
	StatusID         int    `json:"statusId"`
	WarehouseName    string `json:"warehouseName"`
	AcceptedQuantity int    `json:"acceptedQuantity"`
	SupplyDate       string `json:"supplyDate,omitempty"`
	FactDate         string `json:"factDate,omitempty"`
}

type WildberriesImportLine struct {
	ShipmentItemID    string `json:"shipmentItemId"`
	ProductID         string `json:"productId"`
	Article           string `json:"article"`
	Barcode           string `json:"barcode"`
	SentQty           int    `json:"sentQty"`
	CurrentAccepted   int    `json:"currentAccepted"`
	ImportAcceptedQty int    `json:"importAcceptedQty"`
	Matched           bool   `json:"matched"`
}

type WildberriesUnmatchedGood struct {
	Barcode          string `json:"barcode"`
	VendorCode       string `json:"vendorCode"`
	NmID             int64  `json:"nmId"`
	TechSize         string `json:"techSize,omitempty"`
	AcceptedQuantity int    `json:"acceptedQuantity"`
}

type WildberriesImportPreviewResponse struct {
	Supply         WildberriesSupplySummary   `json:"supply"`
	Lines          []WildberriesImportLine    `json:"lines"`
	UnmatchedGoods []WildberriesUnmatchedGood `json:"unmatchedGoods"`
	Warnings       []string                   `json:"warnings,omitempty"`
}

type WildberriesImportApplyRequest struct {
	SupplyID     int64  `json:"supplyId"`
	MatchBy      string `json:"matchBy"`
	IsPreorderID bool   `json:"isPreorderID"`
}

type WildberriesImportApplyResponse struct {
	UpdatedItems int `json:"updatedItems"`
}
