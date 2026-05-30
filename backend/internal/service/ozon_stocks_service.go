package service

import (
	"context"
	"errors"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/ozon"
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
	client := ozon.NewClient(s.cfg.OzonBaseURL, s.cfg.OzonClientID, s.cfg.OzonAPIKey)
	raw, err := client.FetchAllStockRows(ctx)
	if err != nil {
		if errors.Is(err, ozon.ErrCredentialsMissing) {
			return nil, ErrOzonCredentialsNotConfigured
		}
		return nil, err
	}
	items := make([]dto.OzonStockItem, 0, len(raw))
	for _, r := range raw {
		art := r.OfferID
		items = append(items, dto.OzonStockItem{
			Sku:           r.SKU,
			ProductID:     r.ProductID,
			OfferID:       art,
			Article:       art,
			Name:          r.Name,
			WarehouseName: r.WarehouseName,
			Quantity:      r.Quantity,
		})
	}
	return &dto.OzonStockListResponse{Items: items, Total: len(items)}, nil
}
