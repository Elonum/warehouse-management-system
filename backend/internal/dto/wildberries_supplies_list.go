package dto

// WildberriesSupplyListRequest filters WB POST /api/v1/supplies.
type WildberriesSupplyListRequest struct {
	Limit     int               `json:"limit"`
	Offset    int               `json:"offset"`
	StatusIDs []int             `json:"statusIds"`
	Dates     []WbDateFilterDTO `json:"dates"`
}

type WbDateFilterDTO struct {
	From string `json:"from"`
	Till string `json:"till"`
	Type string `json:"type"`
}

// WildberriesSupplyListResponse is the envelope for list results.
type WildberriesSupplyListResponse struct {
	Items []WildberriesSupplyListItem `json:"items"`
}

// WildberriesSupplyListItem is normalized for UI + import (importId / importAsPreorder).
type WildberriesSupplyListItem struct {
	SupplyID   *int64 `json:"supplyId,omitempty"`
	PreorderID *int64 `json:"preorderId,omitempty"`
	StatusID   int    `json:"statusId"`
	CreateDate string `json:"createDate,omitempty"`
	SupplyDate string `json:"supplyDate,omitempty"`
	FactDate   string `json:"factDate,omitempty"`
	UpdatedDate string `json:"updatedDate,omitempty"`
	BoxTypeID  int    `json:"boxTypeId,omitempty"`
	Phone      string `json:"phone,omitempty"`

	ImportID          int64 `json:"importId"`
	ImportAsPreorder  bool  `json:"importAsPreorder"`
}
