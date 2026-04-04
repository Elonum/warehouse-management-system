package service

import (
	"context"
	"errors"
	"strings"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/wildberries"
)

var (
	ErrWbStatisticsTokenNotConfigured = errors.New("WB_STATISTICS_TOKEN is not configured")
	ErrWbStockListInvalidDateFrom     = errors.New("invalid wildberries stocks dateFrom")
)

// WildberriesStockService проксирует остатки из WB Statistics API; данные не сохраняются в БД.
type WildberriesStockService struct {
	cfg config.Config
}

func NewWildberriesStockService(cfg config.Config) *WildberriesStockService {
	return &WildberriesStockService{cfg: cfg}
}

func (s *WildberriesStockService) List(ctx context.Context, req dto.WildberriesStockListRequest) (*dto.WildberriesStockListResponse, error) {
	if strings.TrimSpace(s.cfg.WbStatisticsToken) == "" {
		return nil, ErrWbStatisticsTokenNotConfigured
	}
	dateFrom, err := wildberries.ParseStatisticsDateFrom(req.DateFrom)
	if err != nil {
		return nil, ErrWbStockListInvalidDateFrom
	}
	client := wildberries.NewStatisticsClient(s.cfg.WbStatisticsBaseURL, s.cfg.WbStatisticsToken)
	raw, err := client.FetchAllSupplierStocks(ctx, dateFrom)
	if err != nil {
		return nil, err
	}
	merged := wildberries.DedupeSupplierStocks(raw)
	items := make([]dto.WildberriesStockItem, 0, len(merged))
	for _, r := range merged {
		art := strings.TrimSpace(r.SupplierArticle)
		items = append(items, dto.WildberriesStockItem{
			NmID:            r.NmID,
			SupplierArticle: art,
			Article:         art,
			Barcode:         strings.TrimSpace(r.Barcode),
			WarehouseName:   strings.TrimSpace(r.WarehouseName),
			Quantity:        wildberries.SellableQuantity(r),
			TechSize:        strings.TrimSpace(r.TechSize),
			LastChangeDate:  strings.TrimSpace(r.LastChangeDate),
		})
	}
	return &dto.WildberriesStockListResponse{Items: items, Total: len(items)}, nil
}
