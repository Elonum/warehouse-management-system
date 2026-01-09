package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
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
		return nil, err
	}

	res := make([]dto.StockItemResponse, 0, len(items))
	for _, item := range items {
		res = append(res, dto.StockItemResponse{
			ProductID:       item.ProductID,
			WarehouseID:     item.WarehouseID,
			CurrentQuantity: item.CurrentQuantity,
		})
	}

	return res, nil
}
