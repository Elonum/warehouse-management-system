package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type StockService struct {
	repo *repository.StockRepository
}

func NewStockService(repo *repository.StockRepository) *StockService {
	return &StockService{repo: repo}
}

func (s *StockService) GetCurrentStock(
	ctx context.Context,
	warehouseID *int,
	limit int,
	offset int,
) ([]dto.StockItemResponse, error) {

	items, err := s.repo.GetCurrentStock(ctx, warehouseID, limit, offset)
	if err != nil {
		log.Error().Err(err).
			Interface("warehouseId", warehouseID).
			Int("limit", limit).
			Int("offset", offset).
			Msg("Failed to get current stock")
		return nil, err
	}

	result := make([]dto.StockItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.StockItemResponse{
			ProductID:       item.ProductID,
			WarehouseID:     item.WarehouseID,
			CurrentQuantity: item.CurrentQuantity,
		})
	}

	return result, nil
}
