package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type OrderStatusService struct {
	repo *repository.OrderStatusRepository
}

func NewOrderStatusService(repo *repository.OrderStatusRepository) *OrderStatusService {
	return &OrderStatusService{repo: repo}
}

func (s *OrderStatusService) GetByID(ctx context.Context, statusID int) (*dto.OrderStatusResponse, error) {
	status, err := s.repo.GetByID(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to get order status by ID")
		return nil, err
	}

	return &dto.OrderStatusResponse{
		OrderStatusID: status.OrderStatusID,
		Name:          status.Name,
	}, nil
}

func (s *OrderStatusService) List(ctx context.Context, limit, offset int) ([]dto.OrderStatusResponse, error) {
	statuses, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list order statuses")
		return nil, err
	}

	result := make([]dto.OrderStatusResponse, 0, len(statuses))
	for _, status := range statuses {
		result = append(result, dto.OrderStatusResponse{
			OrderStatusID: status.OrderStatusID,
			Name:          status.Name,
		})
	}

	return result, nil
}

func (s *OrderStatusService) Create(ctx context.Context, req dto.OrderStatusCreateRequest) (*dto.OrderStatusResponse, error) {
	status, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create order status")
		return nil, err
	}

	log.Info().Int("statusId", status.OrderStatusID).Str("name", status.Name).Msg("Order status created successfully")
	return &dto.OrderStatusResponse{
		OrderStatusID: status.OrderStatusID,
		Name:          status.Name,
	}, nil
}

func (s *OrderStatusService) Update(ctx context.Context, statusID int, req dto.OrderStatusUpdateRequest) (*dto.OrderStatusResponse, error) {
	status, err := s.repo.Update(ctx, statusID, req.Name)
	if err != nil {
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to update order status")
		return nil, err
	}

	log.Info().Int("statusId", statusID).Msg("Order status updated successfully")
	return &dto.OrderStatusResponse{
		OrderStatusID: status.OrderStatusID,
		Name:          status.Name,
	}, nil
}

func (s *OrderStatusService) Delete(ctx context.Context, statusID int) error {
	err := s.repo.Delete(ctx, statusID)
	if err != nil {
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to delete order status")
		return err
	}

	log.Info().Int("statusId", statusID).Msg("Order status deleted successfully")
	return nil
}
