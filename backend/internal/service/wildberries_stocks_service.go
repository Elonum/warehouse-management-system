package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/integrationlog"
	"warehouse-backend/internal/integration/upstream"
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

	cacheKey := fmt.Sprintf("wildberries:stocks:%s", dateFrom)
	out, cacheHit, err := upstream.GetOrFetch(upstream.Stocks, ctx, cacheKey, func(ctx context.Context) (*dto.WildberriesStockListResponse, error) {
		return s.fetchUpstream(ctx, dateFrom)
	})
	if err != nil {
		call := wildberries.SupplierStocksCall(s.cfg.WbStatisticsBaseURL)
		integrationlog.LogExternalCall(log.Warn().Err(err), call).
			Str("date_from", dateFrom).
			Bool("cache_hit", cacheHit).
			Str("error_detail", integrationlog.Truncate(err.Error(), 500)).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries stocks fetch failed")
		return nil, err
	}

	call := wildberries.SupplierStocksCall(s.cfg.WbStatisticsBaseURL)
	integrationlog.LogExternalCall(log.Info(), call).
		Str("date_from", dateFrom).
		Bool("cache_hit", cacheHit).
		Int("items", len(out.Items)).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries stocks fetch completed")
	return out, nil
}

func (s *WildberriesStockService) fetchUpstream(ctx context.Context, dateFrom string) (*dto.WildberriesStockListResponse, error) {
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
