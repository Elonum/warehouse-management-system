package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type ShipmentStatusService struct {
	repo *repository.ShipmentStatusRepository
}

func NewShipmentStatusService(repo *repository.ShipmentStatusRepository) *ShipmentStatusService {
	return &ShipmentStatusService{repo: repo}
}

func (s *ShipmentStatusService) GetByID(ctx context.Context, statusID uuid.UUID) (*dto.ShipmentStatusResponse, error) {
	status, err := s.repo.GetByID(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to get shipment status by ID")
		return nil, err
	}

	return &dto.ShipmentStatusResponse{
		ShipmentStatusID: status.ShipmentStatusID.String(),
		Name:             status.Name,
	}, nil
}

func (s *ShipmentStatusService) List(ctx context.Context, limit, offset int) ([]dto.ShipmentStatusResponse, error) {
	statuses, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list shipment statuses")
		return nil, err
	}

	result := make([]dto.ShipmentStatusResponse, 0, len(statuses))
	for _, status := range statuses {
		result = append(result, dto.ShipmentStatusResponse{
			ShipmentStatusID: status.ShipmentStatusID.String(),
			Name:             status.Name,
		})
	}

	return result, nil
}

func (s *ShipmentStatusService) Create(ctx context.Context, req dto.ShipmentStatusCreateRequest) (*dto.ShipmentStatusResponse, error) {
	status, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create shipment status")
		return nil, err
	}

	log.Info().Str("statusId", status.ShipmentStatusID.String()).Str("name", status.Name).Msg("Shipment status created successfully")
	return &dto.ShipmentStatusResponse{
		ShipmentStatusID: status.ShipmentStatusID.String(),
		Name:             status.Name,
	}, nil
}

func (s *ShipmentStatusService) Update(ctx context.Context, statusID uuid.UUID, req dto.ShipmentStatusUpdateRequest) (*dto.ShipmentStatusResponse, error) {
	status, err := s.repo.Update(ctx, statusID, req.Name)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to update shipment status")
		return nil, err
	}

	log.Info().Str("statusId", statusID.String()).Msg("Shipment status updated successfully")
	return &dto.ShipmentStatusResponse{
		ShipmentStatusID: status.ShipmentStatusID.String(),
		Name:             status.Name,
	}, nil
}

func (s *ShipmentStatusService) Delete(ctx context.Context, statusID uuid.UUID) error {
	err := s.repo.Delete(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to delete shipment status")
		return err
	}

	log.Info().Str("statusId", statusID.String()).Msg("Shipment status deleted successfully")
	return nil
}
