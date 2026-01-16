package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type WarehouseTypeService struct {
	repo *repository.WarehouseTypeRepository
}

func NewWarehouseTypeService(repo *repository.WarehouseTypeRepository) *WarehouseTypeService {
	return &WarehouseTypeService{repo: repo}
}

func (s *WarehouseTypeService) GetByID(ctx context.Context, warehouseTypeID int) (*dto.WarehouseTypeResponse, error) {
	warehouseType, err := s.repo.GetByID(ctx, warehouseTypeID)
	if err != nil {
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to get warehouse type by ID")
		return nil, err
	}

	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID,
		Name:            warehouseType.Name,
	}, nil
}

func (s *WarehouseTypeService) List(ctx context.Context, limit, offset int) ([]dto.WarehouseTypeResponse, error) {
	warehouseTypes, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list warehouse types")
		return nil, err
	}

	result := make([]dto.WarehouseTypeResponse, 0, len(warehouseTypes))
	for _, warehouseType := range warehouseTypes {
		result = append(result, dto.WarehouseTypeResponse{
			WarehouseTypeID: warehouseType.WarehouseTypeID,
			Name:            warehouseType.Name,
		})
	}

	return result, nil
}

func (s *WarehouseTypeService) Create(ctx context.Context, req dto.WarehouseTypeCreateRequest) (*dto.WarehouseTypeResponse, error) {
	warehouseType, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse type")
		return nil, err
	}

	log.Info().Int("warehouseTypeId", warehouseType.WarehouseTypeID).Str("name", warehouseType.Name).Msg("Warehouse type created successfully")
	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID,
		Name:            warehouseType.Name,
	}, nil
}

func (s *WarehouseTypeService) Update(ctx context.Context, warehouseTypeID int, req dto.WarehouseTypeUpdateRequest) (*dto.WarehouseTypeResponse, error) {
	warehouseType, err := s.repo.Update(ctx, warehouseTypeID, req.Name)
	if err != nil {
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to update warehouse type")
		return nil, err
	}

	log.Info().Int("warehouseTypeId", warehouseTypeID).Msg("Warehouse type updated successfully")
	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID,
		Name:            warehouseType.Name,
	}, nil
}

func (s *WarehouseTypeService) Delete(ctx context.Context, warehouseTypeID int) error {
	err := s.repo.Delete(ctx, warehouseTypeID)
	if err != nil {
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to delete warehouse type")
		return err
	}

	log.Info().Int("warehouseTypeId", warehouseTypeID).Msg("Warehouse type deleted successfully")
	return nil
}
