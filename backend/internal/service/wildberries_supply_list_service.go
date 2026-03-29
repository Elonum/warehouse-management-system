package service

import (
	"context"
	"errors"
	"strings"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/wildberries"
)

// ErrWbSupplyListInvalidParams is returned for bad limit/offset in list requests.
var ErrWbSupplyListInvalidParams = errors.New("invalid wildberries supplies list parameters")

// WildberriesSupplyListService returns WB supplies for the UI; data is not stored in our DB.
type WildberriesSupplyListService struct {
	cfg config.Config
}

func NewWildberriesSupplyListService(cfg config.Config) *WildberriesSupplyListService {
	return &WildberriesSupplyListService{cfg: cfg}
}

func (s *WildberriesSupplyListService) List(ctx context.Context, req dto.WildberriesSupplyListRequest) (*dto.WildberriesSupplyListResponse, error) {
	client, err := newWbSuppliesClient(s.cfg)
	if err != nil {
		return nil, err
	}

	limit := req.Limit
	if limit == 0 {
		limit = 100
	}
	if limit < 0 || limit > 1000 {
		return nil, ErrWbSupplyListInvalidParams
	}
	offset := req.Offset
	if offset < 0 {
		return nil, ErrWbSupplyListInvalidParams
	}

	filter := wildberries.ListSuppliesFilter{}
	if len(req.StatusIDs) > 0 {
		filter.StatusIDs = append(filter.StatusIDs, req.StatusIDs...)
	}
	for _, d := range req.Dates {
		if strings.TrimSpace(d.From) == "" || strings.TrimSpace(d.Till) == "" || strings.TrimSpace(d.Type) == "" {
			continue
		}
		filter.Dates = append(filter.Dates, wildberries.DateFilter{
			From: d.From,
			Till: d.Till,
			Type: d.Type,
		})
	}

	rawRows, err := client.ListSupplies(ctx, limit, offset, filter)
	if err != nil {
		return nil, err
	}

	items := make([]dto.WildberriesSupplyListItem, 0, len(rawRows))
	for _, raw := range rawRows {
		item, ok := normalizeWbSupplyListRow(raw)
		if !ok {
			continue
		}
		items = append(items, item)
	}

	return &dto.WildberriesSupplyListResponse{Items: items}, nil
}

func normalizeWbSupplyListRow(raw wildberries.SupplyListRow) (dto.WildberriesSupplyListItem, bool) {
	item := dto.WildberriesSupplyListItem{
		StatusID:    raw.StatusID,
		CreateDate:  raw.CreateDate,
		SupplyDate:  raw.SupplyDate,
		FactDate:    raw.FactDate,
		UpdatedDate: raw.UpdatedDate,
		BoxTypeID:   raw.BoxTypeID,
		Phone:       raw.Phone,
	}
	if raw.SupplyID != nil && *raw.SupplyID > 0 {
		sid := *raw.SupplyID
		item.SupplyID = &sid
		item.ImportID = sid
		item.ImportAsPreorder = false
		return item, true
	}
	if raw.PreorderID != nil && *raw.PreorderID > 0 {
		pid := *raw.PreorderID
		item.PreorderID = &pid
		item.ImportID = pid
		item.ImportAsPreorder = true
		return item, true
	}
	return dto.WildberriesSupplyListItem{}, false
}
