package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type WarehouseService struct {
	repo *repository.WarehouseRepository
}

func NewWarehouseService(repo *repository.WarehouseRepository) *WarehouseService {
	return &WarehouseService{repo: repo}
}

func (s *WarehouseService) GetByID(ctx context.Context, warehouseID int) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.GetByID(ctx, warehouseID)
	if err != nil {
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to get warehouse by ID")
		return nil, err
	}

	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID,
		Name:            warehouse.Name,
		WarehouseTypeID: warehouse.WarehouseTypeID,
		Location:        warehouse.Location,
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
			WarehouseID:     warehouse.WarehouseID,
			Name:            warehouse.Name,
			WarehouseTypeID: warehouse.WarehouseTypeID,
			Location:        warehouse.Location,
		})
	}

	return result, nil
}

func (s *WarehouseService) Create(ctx context.Context, req dto.WarehouseCreateRequest) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.Create(ctx, req.Name, req.WarehouseTypeID, req.Location)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse")
		return nil, err
	}

	log.Info().Int("warehouseId", warehouse.WarehouseID).Str("name", warehouse.Name).Msg("Warehouse created successfully")
	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID,
		Name:            warehouse.Name,
		WarehouseTypeID: warehouse.WarehouseTypeID,
		Location:        warehouse.Location,
	}, nil
}

func (s *WarehouseService) Update(ctx context.Context, warehouseID int, req dto.WarehouseUpdateRequest) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.Update(ctx, warehouseID, req.Name, req.WarehouseTypeID, req.Location)
	if err != nil {
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to update warehouse")
		return nil, err
	}

	log.Info().Int("warehouseId", warehouseID).Msg("Warehouse updated successfully")
	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID,
		Name:            warehouse.Name,
		WarehouseTypeID: warehouse.WarehouseTypeID,
		Location:        warehouse.Location,
	}, nil
}

func (s *WarehouseService) Delete(ctx context.Context, warehouseID int) error {
	err := s.repo.Delete(ctx, warehouseID)
	if err != nil {
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to delete warehouse")
		return err
	}

	log.Info().Int("warehouseId", warehouseID).Msg("Warehouse deleted successfully")
	return nil
}
