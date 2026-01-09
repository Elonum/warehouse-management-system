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
) ([]dto.StockItemResponse, error) {

	items, err := s.repo.GetCurrentStock(ctx, warehouseID)
	if err != nil {
		return nil, err
	}

	response := make([]dto.StockItemResponse, 0, len(items))
	for _, i := range items {
		response = append(response, dto.StockItemResponse{
			ProductID:       i.ProductID,
			WarehouseID:     i.WarehouseID,
			CurrentQuantity: i.CurrentQuantity,
		})
	}

	return response, nil
}
