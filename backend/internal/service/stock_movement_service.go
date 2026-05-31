package service

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type StockMovementService struct {
	repo *repository.StockMovementRepository
}

func NewStockMovementService(repo *repository.StockMovementRepository) *StockMovementService {
	return &StockMovementService{repo: repo}
}

func (s *StockMovementService) List(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	movementType repository.StockMovementType,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
	limit int,
	offset int,
) (*dto.StockMovementListResponse, error) {
	var rows []repository.StockMovementRow
	var summary repository.StockMovementSummary
	var listErr, summaryErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		rows, listErr = s.repo.List(ctx, warehouseID, productID, movementType, q, dateFrom, dateTo, ownWarehousesOnly, limit, offset)
	}()
	go func() {
		defer wg.Done()
		summary, summaryErr = s.repo.Summarize(ctx, warehouseID, productID, movementType, q, dateFrom, dateTo, ownWarehousesOnly)
	}()
	wg.Wait()

	if listErr != nil {
		log.Error().Err(listErr).Msg("failed to list stock movements")
		return nil, listErr
	}
	if summaryErr != nil {
		log.Error().Err(summaryErr).Msg("failed to summarize stock movements")
		return nil, summaryErr
	}

	items := make([]dto.StockMovementItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.StockMovementItemResponse{
			MovementDate:    row.MovementDate,
			Quantity:        row.Quantity,
			MovementType:    row.MovementType,
			DocumentID:      row.DocumentID.String(),
			DocumentNumber:  row.DocumentNumber,
			ProductID:       row.ProductID.String(),
			ProductArticle:  row.ProductArticle,
			ProductBarcode:  row.ProductBarcode,
			WarehouseID:     row.WarehouseID.String(),
			WarehouseName:   row.WarehouseName,
			IsMarketplaceWH: row.IsMarketplaceWH,
		})
	}

	return &dto.StockMovementListResponse{
		Items: items,
		Summary: dto.StockMovementSummaryResponse{
			TotalRows: clampInt64(summary.TotalRows),
			TotalIn:   clampInt64(summary.TotalIn),
			TotalOut:  clampInt64(summary.TotalOut),
		},
	}, nil
}

func clampInt64(v int64) int {
	if v > int64(math.MaxInt) {
		return math.MaxInt
	}
	if v < 0 {
		return 0
	}
	return int(v)
}
