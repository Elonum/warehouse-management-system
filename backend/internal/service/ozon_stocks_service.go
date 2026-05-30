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

	"github.com/rs/zerolog/log"
)

var ErrOzonCredentialsNotConfigured = errors.New("OZON credentials are not configured")

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
	client := ozon.NewClient(s.cfg.OzonBaseURL, s.cfg.OzonClientID, s.cfg.OzonAPIKey)
	raw, meta, err := client.FetchAllStockRows(ctx)
	if err != nil {
		log.Warn().
			Str("integration", "ozon").
			Err(err).
			Str("stages", integrationlog.Truncate(meta.Summary(), 1200)).
			Dur("duration", time.Since(startedAt)).
			Msg("ozon stocks fetch failed")
		if errors.Is(err, ozon.ErrCredentialsMissing) {
			return nil, ErrOzonCredentialsNotConfigured
		}
		return nil, err
	}
	if len(raw) == 0 {
		err = fmt.Errorf("%w (%s)", ozon.ErrOzonStocksEmpty, meta.Summary())
		log.Warn().
			Str("integration", "ozon").
			Err(err).
			Str("stages", integrationlog.Truncate(meta.Summary(), 1200)).
			Dur("duration", time.Since(startedAt)).
			Msg("ozon stocks fetch returned zero rows")
		return nil, err
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
	log.Info().
		Str("integration", "ozon").
		Str("source", meta.Source).
		Str("stages", integrationlog.Truncate(meta.Summary(), 1200)).
		Int("items", len(items)).
		Dur("duration", time.Since(startedAt)).
		Msg("ozon stocks fetch completed")
	return &dto.OzonStockListResponse{Items: items, Total: len(items)}, nil
}
