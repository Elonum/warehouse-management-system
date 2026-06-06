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
	"warehouse-backend/internal/integration/ozon"
	"warehouse-backend/internal/integration/upstream"

	"github.com/rs/zerolog/log"
)

var ErrOzonCredentialsNotConfigured = errors.New("OZON credentials are not configured")

const ozonStocksCacheKey = "ozon:stocks"

// OzonStockService проксирует остатки Ozon Seller API; данные не сохраняются в БД.
type OzonStockService struct {
	cfg config.Config
}

func NewOzonStockService(cfg config.Config) *OzonStockService {
	return &OzonStockService{cfg: cfg}
}

func (s *OzonStockService) List(ctx context.Context, _ dto.OzonStockListRequest) (*dto.OzonStockListResponse, error) {
	if s.cfg.OzonClientID == "" || s.cfg.OzonAPIKey == "" {
		return nil, ErrOzonCredentialsNotConfigured
	}
	startedAt := time.Now()

	type cachedOzonStocks struct {
		Items  []dto.OzonStockItem
		Source string
		Stages string
	}

	cached, cacheHit, err := upstream.GetOrFetch(upstream.Stocks, ctx, ozonStocksCacheKey, func(ctx context.Context) (cachedOzonStocks, error) {
		client := ozon.NewClient(s.cfg.OzonBaseURL, s.cfg.OzonClientID, s.cfg.OzonAPIKey)
		raw, meta, fetchErr := client.FetchAllStockRows(ctx)
		if fetchErr != nil {
			return cachedOzonStocks{}, fetchErr
		}
		if len(raw) == 0 {
			return cachedOzonStocks{}, fmt.Errorf("%w (%s)", ozon.ErrOzonStocksEmpty, meta.Summary())
		}
		items := make([]dto.OzonStockItem, 0, len(raw))
		for _, r := range raw {
			art := strings.TrimSpace(r.OfferID)
			name := strings.TrimSpace(r.Name)
			items = append(items, dto.OzonStockItem{
				Sku:           r.SKU,
				ProductID:     r.ProductID,
				OfferID:       art,
				Article:       art,
				Name:          name,
				WarehouseName: strings.TrimSpace(r.WarehouseName),
				Quantity:      r.Quantity,
			})
		}
		return cachedOzonStocks{
			Items:  items,
			Source: meta.Source,
			Stages: meta.Summary(),
		}, nil
	})
	if err != nil {
		integrationlog.LogExternalCall(log.Warn().Err(err), ozon.SourceExternalCall(s.cfg.OzonBaseURL, cached.Source)).
			Bool("cache_hit", cacheHit).
			Str("stages", integrationlog.Truncate(cached.Stages, 1200)).
			Dur("duration", time.Since(startedAt)).
			Msg("ozon stocks fetch failed")
		if errors.Is(err, ozon.ErrCredentialsMissing) {
			return nil, ErrOzonCredentialsNotConfigured
		}
		return nil, err
	}

	integrationlog.LogExternalCall(log.Info(), ozon.SourceExternalCall(s.cfg.OzonBaseURL, cached.Source)).
		Str("source", cached.Source).
		Bool("cache_hit", cacheHit).
		Str("stages", integrationlog.Truncate(cached.Stages, 1200)).
		Int("items", len(cached.Items)).
		Dur("duration", time.Since(startedAt)).
		Msg("ozon stocks fetch completed")
	return &dto.OzonStockListResponse{Items: cached.Items, Total: len(cached.Items)}, nil
}
