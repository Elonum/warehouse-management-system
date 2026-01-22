package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type WarehouseService struct {
	repo              *repository.WarehouseRepository
	warehouseTypeRepo *repository.WarehouseTypeRepository
}

func NewWarehouseService(repo *repository.WarehouseRepository, warehouseTypeRepo *repository.WarehouseTypeRepository) *WarehouseService {
	return &WarehouseService{
		repo:              repo,
		warehouseTypeRepo: warehouseTypeRepo,
	}
}

func (s *WarehouseService) GetByID(ctx context.Context, warehouseID uuid.UUID) (*dto.WarehouseResponse, error) {
	warehouse, err := s.repo.GetByID(ctx, warehouseID)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", warehouseID.String()).Msg("Failed to get warehouse by ID")
		return nil, err
	}

	var warehouseTypeIDStr *string
	if warehouse.WarehouseTypeID != nil {
		str := warehouse.WarehouseTypeID.String()
		warehouseTypeIDStr = &str
	}

	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID.String(),
		Name:            warehouse.Name,
		WarehouseTypeID: warehouseTypeIDStr,
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
		var warehouseTypeIDStr *string
		if warehouse.WarehouseTypeID != nil {
			str := warehouse.WarehouseTypeID.String()
			warehouseTypeIDStr = &str
		}
		result = append(result, dto.WarehouseResponse{
			WarehouseID:     warehouse.WarehouseID.String(),
			Name:            warehouse.Name,
			WarehouseTypeID: warehouseTypeIDStr,
			Location:        warehouse.Location,
		})
	}

	return result, nil
}

func (s *WarehouseService) Create(ctx context.Context, req dto.WarehouseCreateRequest) (*dto.WarehouseResponse, error) {
	var warehouseTypeID *uuid.UUID
	if req.WarehouseTypeID != nil && *req.WarehouseTypeID != "" {
		id, err := uuid.Parse(*req.WarehouseTypeID)
		if err != nil {
			log.Warn().Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Invalid warehouse type ID format")
			return nil, repository.ErrWarehouseTypeNotFound
		}
		warehouseTypeID = &id

		_, err = s.warehouseTypeRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseTypeNotFound {
				log.Warn().Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Warehouse type not found")
				return nil, repository.ErrWarehouseTypeNotFound
			}
			log.Error().Err(err).Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Failed to validate warehouse type")
			return nil, err
		}
	}

	warehouse, err := s.repo.Create(ctx, req.Name, warehouseTypeID, req.Location)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse")
		return nil, err
	}

	var warehouseTypeIDStr *string
	if warehouse.WarehouseTypeID != nil {
		str := warehouse.WarehouseTypeID.String()
		warehouseTypeIDStr = &str
	}

	log.Info().Str("warehouseId", warehouse.WarehouseID.String()).Str("name", warehouse.Name).Msg("Warehouse created successfully")
	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID.String(),
		Name:            warehouse.Name,
		WarehouseTypeID: warehouseTypeIDStr,
		Location:        warehouse.Location,
	}, nil
}

func (s *WarehouseService) Update(ctx context.Context, warehouseID uuid.UUID, req dto.WarehouseUpdateRequest) (*dto.WarehouseResponse, error) {
	var warehouseTypeID *uuid.UUID
	if req.WarehouseTypeID != nil && *req.WarehouseTypeID != "" {
		id, err := uuid.Parse(*req.WarehouseTypeID)
		if err != nil {
			log.Warn().Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Invalid warehouse type ID format")
			return nil, repository.ErrWarehouseTypeNotFound
		}
		warehouseTypeID = &id

		_, err = s.warehouseTypeRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseTypeNotFound {
				log.Warn().Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Warehouse type not found")
				return nil, repository.ErrWarehouseTypeNotFound
			}
			log.Error().Err(err).Str("warehouseTypeId", *req.WarehouseTypeID).Msg("Failed to validate warehouse type")
			return nil, err
		}
	}

	warehouse, err := s.repo.Update(ctx, warehouseID, req.Name, warehouseTypeID, req.Location)
	if err != nil {
		log.Error().Err(err).Str("warehouseId", warehouseID.String()).Msg("Failed to update warehouse")
		return nil, err
	}

	var warehouseTypeIDStr *string
	if warehouse.WarehouseTypeID != nil {
		str := warehouse.WarehouseTypeID.String()
		warehouseTypeIDStr = &str
	}

	log.Info().Str("warehouseId", warehouseID.String()).Msg("Warehouse updated successfully")
	return &dto.WarehouseResponse{
		WarehouseID:     warehouse.WarehouseID.String(),
		Name:            warehouse.Name,
		WarehouseTypeID: warehouseTypeIDStr,
		Location:        warehouse.Location,
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
