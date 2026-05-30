package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/integrationlog"
	"warehouse-backend/internal/integration/wildberries"

	"github.com/rs/zerolog/log"
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
	startedAt := time.Now()
	dateFrom, err := wildberries.ParseStatisticsDateFrom(req.DateFrom)
	if err != nil {
		return nil, ErrWbStockListInvalidDateFrom
	}
	client := wildberries.NewStatisticsClient(s.cfg.WbStatisticsBaseURL, s.cfg.WbStatisticsToken)
	raw, err := client.FetchAllSupplierStocks(ctx, dateFrom)
	if err != nil {
		log.Warn().
			Str("integration", "wildberries").
			Err(err).
			Str("date_from", dateFrom).
			Str("error_detail", integrationlog.Truncate(err.Error(), 500)).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries stocks fetch failed")
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
	log.Info().
		Str("integration", "wildberries").
		Str("date_from", dateFrom).
		Int("raw_rows", len(raw)).
		Int("deduped_rows", len(merged)).
		Int("items", len(items)).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries stocks fetch completed")
	return &dto.WildberriesStockListResponse{Items: items, Total: len(items)}, nil
}
