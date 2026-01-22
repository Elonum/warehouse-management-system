package service

import (
	"context"

	"github.com/google/uuid"
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

func (s *WarehouseTypeService) GetByID(ctx context.Context, warehouseTypeID uuid.UUID) (*dto.WarehouseTypeResponse, error) {
	warehouseType, err := s.repo.GetByID(ctx, warehouseTypeID)
	if err != nil {
		log.Error().Err(err).Str("warehouseTypeId", warehouseTypeID.String()).Msg("Failed to get warehouse type by ID")
		return nil, err
	}

	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID.String(),
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
			WarehouseTypeID: warehouseType.WarehouseTypeID.String(),
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

	log.Info().Str("warehouseTypeId", warehouseType.WarehouseTypeID.String()).Str("name", warehouseType.Name).Msg("Warehouse type created successfully")
	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID.String(),
		Name:            warehouseType.Name,
	}, nil
}

func (s *WarehouseTypeService) Update(ctx context.Context, warehouseTypeID uuid.UUID, req dto.WarehouseTypeUpdateRequest) (*dto.WarehouseTypeResponse, error) {
	warehouseType, err := s.repo.Update(ctx, warehouseTypeID, req.Name)
	if err != nil {
		log.Error().Err(err).Str("warehouseTypeId", warehouseTypeID.String()).Msg("Failed to update warehouse type")
		return nil, err
	}

	log.Info().Str("warehouseTypeId", warehouseTypeID.String()).Msg("Warehouse type updated successfully")
	return &dto.WarehouseTypeResponse{
		WarehouseTypeID: warehouseType.WarehouseTypeID.String(),
		Name:            warehouseType.Name,
	}, nil
}

func (s *WarehouseTypeService) Delete(ctx context.Context, warehouseTypeID uuid.UUID) error {
	err := s.repo.Delete(ctx, warehouseTypeID)
	if err != nil {
		log.Error().Err(err).Str("warehouseTypeId", warehouseTypeID.String()).Msg("Failed to delete warehouse type")
		return err
	}

	log.Info().Str("warehouseTypeId", warehouseTypeID.String()).Msg("Warehouse type deleted successfully")
	return nil
}
