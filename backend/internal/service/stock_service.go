package service

import (
	"context"
	"math"
	"sync"

	"github.com/google/uuid"
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
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	levelFilter repository.StockLevelFilter,
	limit int,
	offset int,
) ([]dto.StockItemResponse, int, error) {

	var items []repository.StockItem
	var total64 int64
	var getErr, countErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		items, getErr = s.repo.GetCurrentStock(ctx, warehouseID, productID, q, levelFilter, limit, offset)
	}()
	go func() {
		defer wg.Done()
		total64, countErr = s.repo.CountCurrentStock(ctx, warehouseID, productID, q, levelFilter)
	}()
	wg.Wait()

	if getErr != nil {
		log.Error().Err(getErr).
			Interface("warehouseId", warehouseID).
			Interface("productId", productID).
			Interface("q", q).
			Str("levelFilter", string(levelFilter)).
			Int("limit", limit).
			Int("offset", offset).
			Msg("Failed to get current stock")
		return nil, 0, getErr
	}
	if countErr != nil {
		log.Error().Err(countErr).
			Interface("warehouseId", warehouseID).
			Interface("productId", productID).
			Interface("q", q).
			Str("levelFilter", string(levelFilter)).
			Msg("Failed to count current stock")
		return nil, 0, countErr
	}
	total := int(total64)
	if int64(total) != total64 {
		total = math.MaxInt32
	}

	result := make([]dto.StockItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.StockItemResponse{
			ProductID:       item.ProductID.String(),
			WarehouseID:     item.WarehouseID.String(),
			CurrentQuantity: item.CurrentQuantity,
			ReorderPoint:    item.ReorderPoint,
		})
	}

	return result, total, nil
}
