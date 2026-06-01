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

type StockSnapshotService struct {
	repo          *repository.StockSnapshotRepository
	warehouseRepo *repository.WarehouseRepository
	productRepo   *repository.ProductRepository
}

func NewStockSnapshotService(repo *repository.StockSnapshotRepository, warehouseRepo *repository.WarehouseRepository, productRepo *repository.ProductRepository) *StockSnapshotService {
	return &StockSnapshotService{
		repo:          repo,
		warehouseRepo: warehouseRepo,
		productRepo:   productRepo,
	}
}

func (s *StockSnapshotService) GetByID(ctx context.Context, snapshotID uuid.UUID) (*dto.StockSnapshotResponse, error) {
	snapshot, err := s.repo.GetByID(ctx, snapshotID)
	if err != nil {
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to get stock snapshot by ID")
		return nil, err
	}

	var createdByStr *string
	if snapshot.CreatedBy != nil {
		str := snapshot.CreatedBy.String()
		createdByStr = &str
	}

	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID.String(),
		ProductID:    snapshot.ProductID.String(),
		WarehouseID:  snapshot.WarehouseID.String(),
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    createdByStr,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) ListPage(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
	latestOnly bool,
	limit int,
	offset int,
) (*dto.StockSnapshotListResponse, error) {
	var rows []repository.StockSnapshotListRow
	var summary repository.StockSnapshotSummary
	var listErr, summaryErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		rows, listErr = s.repo.ListFiltered(
			ctx, warehouseID, productID, q, dateFrom, dateTo, ownWarehousesOnly, latestOnly, limit, offset,
		)
	}()
	go func() {
		defer wg.Done()
		summary, summaryErr = s.repo.SummarizeList(
			ctx, warehouseID, productID, q, dateFrom, dateTo, ownWarehousesOnly, latestOnly,
		)
	}()
	wg.Wait()

	if listErr != nil {
		log.Error().Err(listErr).Msg("failed to list stock snapshots")
		return nil, listErr
	}
	if summaryErr != nil {
		log.Error().Err(summaryErr).Msg("failed to summarize stock snapshots")
		return nil, summaryErr
	}

	items := make([]dto.StockSnapshotListItemResponse, 0, len(rows))
	for _, row := range rows {
		var createdByStr *string
		if row.CreatedBy != nil {
			str := row.CreatedBy.String()
			createdByStr = &str
		}
		items = append(items, dto.StockSnapshotListItemResponse{
			SnapshotID:      row.SnapshotID.String(),
			ProductID:       row.ProductID.String(),
			ProductArticle:  row.ProductArticle,
			ProductBarcode:  row.ProductBarcode,
			WarehouseID:     row.WarehouseID.String(),
			WarehouseName:   row.WarehouseName,
			IsMarketplaceWH: row.IsMarketplaceWH,
			SnapshotDate:    row.SnapshotDate,
			Quantity:        row.Quantity,
			IsLatestForPair: row.IsLatestForPair,
			CreatedBy:       createdByStr,
			CreatedAt:       row.CreatedAt,
		})
	}

	return &dto.StockSnapshotListResponse{
		Items: items,
		Summary: dto.StockSnapshotSummaryResponse{
			TotalRows:    clampSnapshotInt64(summary.TotalRows),
			UniquePairs:  clampSnapshotInt64(summary.UniquePairs),
			EarliestDate: summary.EarliestDate,
			LatestDate:   summary.LatestDate,
		},
	}, nil
}

func clampSnapshotInt64(v int64) int {
	if v > math.MaxInt {
		return math.MaxInt
	}
	if v < 0 {
		return 0
	}
	return int(v)
}

func (s *StockSnapshotService) Create(ctx context.Context, userID uuid.UUID, req dto.StockSnapshotCreateRequest) (*dto.StockSnapshotResponse, error) {
	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		log.Warn().Str("warehouseId", req.WarehouseID).Msg("Invalid warehouse ID format")
		return nil, repository.ErrWarehouseNotFound
	}
	_, err = s.warehouseRepo.GetByID(ctx, warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.Quantity < 0 {
		log.Warn().Int("quantity", req.Quantity).Msg("Quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	snapshot, err := s.repo.Create(ctx, productID, warehouseID, req.SnapshotDate, req.Quantity, &userID)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Failed to create stock snapshot")
		return nil, err
	}

	var createdByStr *string
	if snapshot.CreatedBy != nil {
		str := snapshot.CreatedBy.String()
		createdByStr = &str
	}

	log.Info().Str("snapshotId", snapshot.SnapshotID.String()).Str("warehouseId", req.WarehouseID).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Stock snapshot created successfully")
	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID.String(),
		ProductID:    snapshot.ProductID.String(),
		WarehouseID:  snapshot.WarehouseID.String(),
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    createdByStr,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) Update(ctx context.Context, snapshotID uuid.UUID, req dto.StockSnapshotUpdateRequest) (*dto.StockSnapshotResponse, error) {
	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		log.Warn().Str("warehouseId", req.WarehouseID).Msg("Invalid warehouse ID format")
		return nil, repository.ErrWarehouseNotFound
	}
	_, err = s.warehouseRepo.GetByID(ctx, warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.Quantity < 0 {
		log.Warn().Int("quantity", req.Quantity).Msg("Quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	snapshot, err := s.repo.Update(ctx, snapshotID, productID, warehouseID, req.SnapshotDate, req.Quantity)
	if err != nil {
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to update stock snapshot")
		return nil, err
	}

	var createdByStr *string
	if snapshot.CreatedBy != nil {
		str := snapshot.CreatedBy.String()
		createdByStr = &str
	}

	log.Info().Str("snapshotId", snapshotID.String()).Msg("Stock snapshot updated successfully")
	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID.String(),
		ProductID:    snapshot.ProductID.String(),
		WarehouseID:  snapshot.WarehouseID.String(),
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    createdByStr,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) Delete(ctx context.Context, snapshotID uuid.UUID) error {
	err := s.repo.Delete(ctx, snapshotID)
	if err != nil {
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to delete stock snapshot")
		return err
	}

	log.Info().Str("snapshotId", snapshotID.String()).Msg("Stock snapshot deleted successfully")
	return nil
}
