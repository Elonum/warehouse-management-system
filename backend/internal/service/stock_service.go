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
) (*dto.StockCurrentListResponse, error) {
	var items []repository.StockItem
	var summary repository.StockCurrentSummary
	var total64 int64
	var getErr, summaryErr, countErr error
	var wg sync.WaitGroup
	wg.Add(3)
	go func() {
		defer wg.Done()
		items, getErr = s.repo.GetCurrentStock(ctx, warehouseID, productID, q, levelFilter, limit, offset)
	}()
	go func() {
		defer wg.Done()
		total64, countErr = s.repo.CountCurrentStock(ctx, warehouseID, productID, q, levelFilter)
	}()
	go func() {
		defer wg.Done()
		summary, summaryErr = s.repo.SummarizeCurrentStock(ctx, warehouseID, productID, q, levelFilter)
	}()
	wg.Wait()

	if getErr != nil {
		log.Error().Err(getErr).Msg("Failed to get current stock")
		return nil, getErr
	}
	if countErr != nil {
		log.Error().Err(countErr).Msg("Failed to count current stock")
		return nil, countErr
	}
	if summaryErr != nil {
		log.Error().Err(summaryErr).Msg("Failed to summarize current stock")
		return nil, summaryErr
	}

	_ = total64 // meta total uses count; summary.TotalRows should match

	result := make([]dto.StockItemResponse, 0, len(items))
	for _, item := range items {
		var unitCost *float64
		var stockValue *float64
		hasCost := item.UnitCostToWarehouse != nil
		if hasCost {
			v := *item.UnitCostToWarehouse
			unitCost = &v
			sv := float64(item.CurrentQuantity) * v
			stockValue = &sv
		}
		result = append(result, dto.StockItemResponse{
			ProductID:       item.ProductID.String(),
			WarehouseID:     item.WarehouseID.String(),
			ProductArticle:  item.ProductArticle,
			ProductBarcode:  item.ProductBarcode,
			CurrentQuantity: item.CurrentQuantity,
			ReorderPoint:    item.ReorderPoint,
			UnitCost:        unitCost,
			StockValue:      stockValue,
			HasUnitCost:     hasCost,
		})
	}

	totalRows := int(total64)
	if int64(totalRows) != total64 {
		totalRows = math.MaxInt32
	}

	return &dto.StockCurrentListResponse{
		Items: result,
		Summary: dto.StockCurrentSummaryResponse{
			TotalStockValue: summary.TotalStockValue,
			RowsMissingCost: clampStockInt64(summary.RowsMissingCost),
			RowsWithCost:    clampStockInt64(summary.RowsWithCost),
			TotalRows:       totalRows,
		},
	}, nil
}

func clampStockInt64(v int64) int {
	if v > math.MaxInt {
		return math.MaxInt
	}
	if v < 0 {
		return 0
	}
	return int(v)
}
