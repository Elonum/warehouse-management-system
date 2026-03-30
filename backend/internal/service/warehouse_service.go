package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type WarehouseService struct {
	repo *repository.WarehouseRepository
}

func NewWarehouseService(repo *repository.WarehouseRepository) *WarehouseService {
	return &WarehouseService{
		repo: repo,
	}
}

func (s *WarehouseService) GetByID(ctx context.Context, warehouseID uuid.UUID) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.GetByID(ctx, warehouseID)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", warehouseID.String()).Msg("Failed to get warehouse by ID")
		return nil, err
	}

	return &dto.WarehouseResponse{
		WarehouseID:   warehouse.WarehouseID.String(),
		Name:          warehouse.Name,
		IsMarketplace: warehouse.IsMarketplace,
		Location:      warehouse.Location,
	}, nil
}

func (s *WarehouseService) List(ctx context.Context, limit, offset int) ([]dto.WarehouseResponse, error) {
	warehouses, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list warehouses")
		return nil, err
	}

	result := make([]dto.WarehouseResponse, 0, len(warehouses))
	for _, warehouse := range warehouses {
		result = append(result, dto.WarehouseResponse{
			WarehouseID:   warehouse.WarehouseID.String(),
			Name:          warehouse.Name,
			IsMarketplace: warehouse.IsMarketplace,
			Location:      warehouse.Location,
		})
	}

	return result, nil
}

func (s *WarehouseService) Create(ctx context.Context, req dto.WarehouseCreateRequest) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.Create(ctx, req.Name, req.IsMarketplace, req.Location)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse")
		return nil, err
	}

	log.Info().Str("warehouseId", warehouse.WarehouseID.String()).Str("name", warehouse.Name).Msg("Warehouse created successfully")
	return &dto.WarehouseResponse{
		WarehouseID:   warehouse.WarehouseID.String(),
		Name:          warehouse.Name,
		IsMarketplace: warehouse.IsMarketplace,
		Location:      warehouse.Location,
	}, nil
}

func (s *WarehouseService) Update(ctx context.Context, warehouseID uuid.UUID, req dto.WarehouseUpdateRequest) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.Update(ctx, warehouseID, req.Name, req.IsMarketplace, req.Location)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", warehouseID.String()).Msg("Failed to update warehouse")
		return nil, err
	}

	log.Info().Str("warehouseId", warehouseID.String()).Msg("Warehouse updated successfully")
	return &dto.WarehouseResponse{
		WarehouseID:   warehouse.WarehouseID.String(),
		Name:          warehouse.Name,
		IsMarketplace: warehouse.IsMarketplace,
		Location:      warehouse.Location,
	}, nil
}

func (s *WarehouseService) Delete(ctx context.Context, warehouseID uuid.UUID) error {
	err := s.repo.Delete(ctx, warehouseID)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", warehouseID.String()).Msg("Failed to delete warehouse")
		return err
	}

	log.Info().Str("warehouseId", warehouseID.String()).Msg("Warehouse deleted successfully")
	return nil
}
