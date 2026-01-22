package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type InventoryStatusService struct {
	repo *repository.InventoryStatusRepository
}

func NewInventoryStatusService(repo *repository.InventoryStatusRepository) *InventoryStatusService {
	return &InventoryStatusService{repo: repo}
}

func (s *InventoryStatusService) GetByID(ctx context.Context, statusID uuid.UUID) (*dto.InventoryStatusResponse, error) {
	status, err := s.repo.GetByID(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to get inventory status by ID")
		return nil, err
	}

	return &dto.InventoryStatusResponse{
		InventoryStatusID: status.InventoryStatusID.String(),
		Name:              status.Name,
	}, nil
}

func (s *InventoryStatusService) List(ctx context.Context, limit, offset int) ([]dto.InventoryStatusResponse, error) {
	statuses, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list inventory statuses")
		return nil, err
	}

	result := make([]dto.InventoryStatusResponse, 0, len(statuses))
	for _, status := range statuses {
		result = append(result, dto.InventoryStatusResponse{
			InventoryStatusID: status.InventoryStatusID.String(),
			Name:              status.Name,
		})
	}

	return result, nil
}

func (s *InventoryStatusService) Create(ctx context.Context, req dto.InventoryStatusCreateRequest) (*dto.InventoryStatusResponse, error) {
	status, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create inventory status")
		return nil, err
	}

	log.Info().Str("statusId", status.InventoryStatusID.String()).Str("name", status.Name).Msg("Inventory status created successfully")
	return &dto.InventoryStatusResponse{
		InventoryStatusID: status.InventoryStatusID.String(),
		Name:              status.Name,
	}, nil
}

func (s *InventoryStatusService) Update(ctx context.Context, statusID uuid.UUID, req dto.InventoryStatusUpdateRequest) (*dto.InventoryStatusResponse, error) {
	status, err := s.repo.Update(ctx, statusID, req.Name)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to update inventory status")
		return nil, err
	}

	log.Info().Str("statusId", statusID.String()).Msg("Inventory status updated successfully")
	return &dto.InventoryStatusResponse{
		InventoryStatusID: status.InventoryStatusID.String(),
		Name:              status.Name,
	}, nil
}

func (s *InventoryStatusService) Delete(ctx context.Context, statusID uuid.UUID) error {
	err := s.repo.Delete(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to delete inventory status")
		return err
	}

	log.Info().Str("statusId", statusID.String()).Msg("Inventory status deleted successfully")
	return nil
}
