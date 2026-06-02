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

type ProductCostService struct {
	repo        *repository.ProductCostRepository
	productRepo *repository.ProductRepository
}

func NewProductCostService(repo *repository.ProductCostRepository, productRepo *repository.ProductRepository) *ProductCostService {
	return &ProductCostService{
		repo:        repo,
		productRepo: productRepo,
	}
}

func toCostResponse(cost *repository.ProductCost) *dto.ProductCostResponse {
	var createdByStr *string
	if cost.CreatedBy != nil {
		str := cost.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if cost.UpdatedBy != nil {
		str := cost.UpdatedBy.String()
		updatedByStr = &str
	}
	return &dto.ProductCostResponse{
		CostID:              cost.CostID.String(),
		ProductID:           cost.ProductID.String(),
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           createdByStr,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           cost.UpdatedAt,
	}
}

func (s *ProductCostService) GetByID(ctx context.Context, costID uuid.UUID) (*dto.ProductCostResponse, error) {
	cost, err := s.repo.GetByID(ctx, costID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to get product cost by ID")
		return nil, err
	}
	return toCostResponse(cost), nil
}

func (s *ProductCostService) ListPage(
	ctx context.Context,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	activeOnly bool,
	limit int,
	offset int,
) (*dto.ProductCostListResponse, error) {
	var rows []repository.ProductCostListRow
	var summary repository.ProductCostSummary
	var listErr, summaryErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		rows, listErr = s.repo.ListFiltered(ctx, productID, q, dateFrom, dateTo, activeOnly, limit, offset)
	}()
	go func() {
		defer wg.Done()
		summary, summaryErr = s.repo.SummarizeList(ctx, productID, q, dateFrom, dateTo, activeOnly)
	}()
	wg.Wait()

	if listErr != nil {
		log.Error().Err(listErr).Msg("failed to list product costs")
		return nil, listErr
	}
	if summaryErr != nil {
		log.Error().Err(summaryErr).Msg("failed to summarize product costs")
		return nil, summaryErr
	}

	items := make([]dto.ProductCostListItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.ProductCostListItemResponse{
			CostID:              row.CostID.String(),
			ProductID:           row.ProductID.String(),
			ProductArticle:      row.ProductArticle,
			ProductBarcode:      row.ProductBarcode,
			PeriodStart:         row.PeriodStart,
			PeriodEnd:           row.PeriodEnd,
			UnitCostToWarehouse: row.UnitCostToWarehouse,
			IsActive:            row.IsActive,
			Notes:               row.Notes,
			CreatedByName:       row.CreatedByName,
			UpdatedByName:       row.UpdatedByName,
			CreatedAt:           row.CreatedAt,
			UpdatedAt:           row.UpdatedAt,
		})
	}

	return &dto.ProductCostListResponse{
		Items: items,
		Summary: dto.ProductCostSummaryResponse{
			TotalRows:   clampCostInt64(summary.TotalRows),
			ActiveRows:  clampCostInt64(summary.ActiveRows),
			ProductRows: clampCostInt64(summary.ProductRows),
		},
	}, nil
}

func clampCostInt64(v int64) int {
	if v > math.MaxInt {
		return math.MaxInt
	}
	if v < 0 {
		return 0
	}
	return int(v)
}

func (s *ProductCostService) validateProduct(ctx context.Context, productIDStr string) (uuid.UUID, error) {
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return uuid.Nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			return uuid.Nil, repository.ErrProductNotFound
		}
		return uuid.Nil, err
	}
	return productID, nil
}

func validatePeriodRange(periodStart time.Time, periodEnd *time.Time) error {
	start := repository.DateOnlyUTC(periodStart)
	if periodEnd == nil {
		return nil
	}
	end := repository.DateOnlyUTC(*periodEnd)
	if end.Before(start) {
		return repository.ErrInvalidDateRange
	}
	return nil
}

func (s *ProductCostService) Create(ctx context.Context, userID uuid.UUID, req dto.ProductCostCreateRequest) (*dto.ProductCostResponse, error) {
	productID, err := s.validateProduct(ctx, req.ProductID)
	if err != nil {
		return nil, err
	}

	if err := validatePeriodRange(req.PeriodStart, req.PeriodEnd); err != nil {
		return nil, err
	}

	if req.UnitCostToWarehouse < 0 {
		return nil, repository.ErrInvalidQuantity
	}

	closePrevious := true
	if req.ClosePrevious != nil {
		closePrevious = *req.ClosePrevious
	}

	cost, err := s.repo.CreateWithClosePrevious(
		ctx,
		productID,
		req.PeriodStart,
		req.PeriodEnd,
		req.UnitCostToWarehouse,
		req.Notes,
		&userID,
		closePrevious,
	)
	if err != nil {
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to create product cost")
		return nil, err
	}

	if syncErr := s.repo.SyncProductUnitCost(ctx, productID); syncErr != nil {
		log.Error().Err(syncErr).Str("productId", productID.String()).Msg("failed to sync product unit_cost after create")
	}
	log.Info().Str("costId", cost.CostID.String()).Str("productId", req.ProductID).Msg("Product cost created")
	return toCostResponse(cost), nil
}

func (s *ProductCostService) Update(ctx context.Context, costID, userID uuid.UUID, req dto.ProductCostUpdateRequest) (*dto.ProductCostResponse, error) {
	productID, err := s.validateProduct(ctx, req.ProductID)
	if err != nil {
		return nil, err
	}

	if err := validatePeriodRange(req.PeriodStart, req.PeriodEnd); err != nil {
		return nil, err
	}

	if req.UnitCostToWarehouse < 0 {
		return nil, repository.ErrInvalidQuantity
	}

	overlap, err := s.repo.HasOverlap(ctx, productID, req.PeriodStart, req.PeriodEnd, &costID)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, repository.ErrPeriodOverlap
	}

	cost, err := s.repo.Update(ctx, costID, productID, req.PeriodStart, req.PeriodEnd, req.UnitCostToWarehouse, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to update product cost")
		return nil, err
	}

	if syncErr := s.repo.SyncProductUnitCost(ctx, productID); syncErr != nil {
		log.Error().Err(syncErr).Str("productId", productID.String()).Msg("failed to sync product unit_cost after update")
	}
	log.Info().Str("costId", costID.String()).Msg("Product cost updated")
	return toCostResponse(cost), nil
}

func (s *ProductCostService) Delete(ctx context.Context, costID uuid.UUID) error {
	existing, err := s.repo.GetByID(ctx, costID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to get product cost before delete")
		return err
	}
	productID := existing.ProductID

	err = s.repo.Delete(ctx, costID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to delete product cost")
		return err
	}
	if syncErr := s.repo.SyncProductUnitCost(ctx, productID); syncErr != nil {
		log.Error().Err(syncErr).Str("productId", productID.String()).Msg("failed to sync product unit_cost after delete")
	}
	log.Info().Str("costId", costID.String()).Msg("Product cost deleted")
	return nil
}

func (s *ProductCostService) ListMissingCost(
	ctx context.Context,
	q *string,
	limit int,
	offset int,
) (*dto.ProductMissingCostListResponse, int, error) {
	var rows []repository.ProductMissingCostRow
	var total int64
	var listErr, countErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		rows, listErr = s.repo.ListProductsMissingCost(ctx, q, limit, offset)
	}()
	go func() {
		defer wg.Done()
		total, countErr = s.repo.CountProductsMissingCost(ctx, q)
	}()
	wg.Wait()
	if listErr != nil {
		return nil, 0, listErr
	}
	if countErr != nil {
		return nil, 0, countErr
	}

	items := make([]dto.ProductMissingCostItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.ProductMissingCostItemResponse{
			ProductID:      row.ProductID.String(),
			ProductArticle: row.ProductArticle,
			ProductBarcode: row.ProductBarcode,
			TotalQuantity:  row.TotalQuantity,
			WarehouseCount: row.WarehouseCount,
		})
	}
	return &dto.ProductMissingCostListResponse{Items: items}, clampCostInt64(total), nil
}

func (s *ProductCostService) GetDataQuality(ctx context.Context) (*dto.ProductCostDataQualityResponse, error) {
	n, err := s.repo.CountOverlapPairs(ctx)
	if err != nil {
		return nil, err
	}
	return &dto.ProductCostDataQualityResponse{OverlapPairCount: n}, nil
}
