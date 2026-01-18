package service

import (
	"context"

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

func (s *StockSnapshotService) GetByID(ctx context.Context, snapshotID int) (*dto.StockSnapshotResponse, error) {
	snapshot, err := s.repo.GetByID(ctx, snapshotID)
	if err != nil {
		log.Error().Err(err).Int("snapshotId", snapshotID).Msg("Failed to get stock snapshot by ID")
		return nil, err
	}

	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID,
		ProductID:    snapshot.ProductID,
		WarehouseID:  snapshot.WarehouseID,
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    snapshot.CreatedBy,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) List(ctx context.Context, limit, offset int, warehouseID, productID *int) ([]dto.StockSnapshotResponse, error) {
	snapshots, err := s.repo.List(ctx, limit, offset, warehouseID, productID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("warehouseId", warehouseID).Interface("productId", productID).
			Msg("Failed to list stock snapshots")
		return nil, err
	}

	result := make([]dto.StockSnapshotResponse, 0, len(snapshots))
	for _, snapshot := range snapshots {
		result = append(result, dto.StockSnapshotResponse{
			SnapshotID:   snapshot.SnapshotID,
			ProductID:    snapshot.ProductID,
			WarehouseID:  snapshot.WarehouseID,
			SnapshotDate: snapshot.SnapshotDate,
			Quantity:     snapshot.Quantity,
			CreatedBy:    snapshot.CreatedBy,
			CreatedAt:    snapshot.CreatedAt,
		})
	}

	return result, nil
}

func (s *StockSnapshotService) Create(ctx context.Context, userID int, req dto.StockSnapshotCreateRequest) (*dto.StockSnapshotResponse, error) {
	_, err := s.warehouseRepo.GetByID(ctx, req.WarehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Int("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	_, err = s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.Quantity < 0 {
		log.Warn().Int("quantity", req.Quantity).Msg("Quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	snapshot, err := s.repo.Create(ctx, req.ProductID, req.WarehouseID, req.SnapshotDate, req.Quantity, &userID)
	if err != nil {
		log.Error().Err(err).Int("warehouseId", req.WarehouseID).Int("productId", req.ProductID).Int("userId", userID).Msg("Failed to create stock snapshot")
		return nil, err
	}

	log.Info().Int("snapshotId", snapshot.SnapshotID).Int("warehouseId", req.WarehouseID).Int("productId", req.ProductID).Int("userId", userID).Msg("Stock snapshot created successfully")
	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID,
		ProductID:    snapshot.ProductID,
		WarehouseID:  snapshot.WarehouseID,
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    snapshot.CreatedBy,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) Update(ctx context.Context, snapshotID int, req dto.StockSnapshotUpdateRequest) (*dto.StockSnapshotResponse, error) {
	_, err := s.warehouseRepo.GetByID(ctx, req.WarehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Int("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	_, err = s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.Quantity < 0 {
		log.Warn().Int("quantity", req.Quantity).Msg("Quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	snapshot, err := s.repo.Update(ctx, snapshotID, req.ProductID, req.WarehouseID, req.SnapshotDate, req.Quantity)
	if err != nil {
		log.Error().Err(err).Int("snapshotId", snapshotID).Msg("Failed to update stock snapshot")
		return nil, err
	}

	log.Info().Int("snapshotId", snapshotID).Msg("Stock snapshot updated successfully")
	return &dto.StockSnapshotResponse{
		SnapshotID:   snapshot.SnapshotID,
		ProductID:    snapshot.ProductID,
		WarehouseID:  snapshot.WarehouseID,
		SnapshotDate: snapshot.SnapshotDate,
		Quantity:     snapshot.Quantity,
		CreatedBy:    snapshot.CreatedBy,
		CreatedAt:    snapshot.CreatedAt,
	}, nil
}

func (s *StockSnapshotService) Delete(ctx context.Context, snapshotID int) error {
	err := s.repo.Delete(ctx, snapshotID)
	if err != nil {
		log.Error().Err(err).Int("snapshotId", snapshotID).Msg("Failed to delete stock snapshot")
		return err
	}

	log.Info().Int("snapshotId", snapshotID).Msg("Stock snapshot deleted successfully")
	return nil
}
