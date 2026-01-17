package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type InventoryService struct {
	repo                *repository.InventoryRepository
	inventoryStatusRepo *repository.InventoryStatusRepository
}

func NewInventoryService(repo *repository.InventoryRepository, inventoryStatusRepo *repository.InventoryStatusRepository) *InventoryService {
	return &InventoryService{
		repo:                repo,
		inventoryStatusRepo: inventoryStatusRepo,
	}
}

func (s *InventoryService) GetByID(ctx context.Context, inventoryID int) (*dto.InventoryResponse, error) {
	inventory, err := s.repo.GetByID(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", inventoryID).Msg("Failed to get inventory by ID")
		return nil, err
	}

	return &dto.InventoryResponse{
		InventoryID:    inventory.InventoryID,
		AdjustmentDate: inventory.AdjustmentDate,
		StatusID:       inventory.StatusID,
		Notes:          inventory.Notes,
		CreatedBy:      inventory.CreatedBy,
		CreatedAt:      inventory.CreatedAt,
		UpdatedBy:      inventory.UpdatedBy,
		UpdatedAt:      inventory.UpdatedAt,
	}, nil
}

func (s *InventoryService) List(ctx context.Context, limit, offset int, statusID *int) ([]dto.InventoryResponse, error) {
	inventories, err := s.repo.List(ctx, limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("statusId", statusID).Msg("Failed to list inventories")
		return nil, err
	}

	result := make([]dto.InventoryResponse, 0, len(inventories))
	for _, inventory := range inventories {
		result = append(result, dto.InventoryResponse{
			InventoryID:    inventory.InventoryID,
			AdjustmentDate: inventory.AdjustmentDate,
			StatusID:       inventory.StatusID,
			Notes:          inventory.Notes,
			CreatedBy:      inventory.CreatedBy,
			CreatedAt:      inventory.CreatedAt,
			UpdatedBy:      inventory.UpdatedBy,
			UpdatedAt:      inventory.UpdatedAt,
		})
	}

	return result, nil
}

func (s *InventoryService) Create(ctx context.Context, userID int, req dto.InventoryCreateRequest) (*dto.InventoryResponse, error) {
	_, err := s.inventoryStatusRepo.GetByID(ctx, req.StatusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Int("statusId", req.StatusID).Msg("Inventory status not found")
			return nil, repository.ErrInventoryStatusNotFound
		}
		log.Error().Err(err).Int("statusId", req.StatusID).Msg("Failed to validate inventory status")
		return nil, err
	}

	inventory, err := s.repo.Create(ctx, req.AdjustmentDate, req.StatusID, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Int("statusId", req.StatusID).Int("userId", userID).Msg("Failed to create inventory")
		return nil, err
	}

	log.Info().Int("inventoryId", inventory.InventoryID).Int("statusId", req.StatusID).Int("userId", userID).Msg("Inventory created successfully")
	return &dto.InventoryResponse{
		InventoryID:    inventory.InventoryID,
		AdjustmentDate: inventory.AdjustmentDate,
		StatusID:       inventory.StatusID,
		Notes:          inventory.Notes,
		CreatedBy:      inventory.CreatedBy,
		CreatedAt:      inventory.CreatedAt,
		UpdatedBy:      inventory.UpdatedBy,
		UpdatedAt:      inventory.UpdatedAt,
	}, nil
}

func (s *InventoryService) Update(ctx context.Context, inventoryID, userID int, req dto.InventoryUpdateRequest) (*dto.InventoryResponse, error) {
	_, err := s.inventoryStatusRepo.GetByID(ctx, req.StatusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Int("statusId", req.StatusID).Msg("Inventory status not found")
			return nil, repository.ErrInventoryStatusNotFound
		}
		log.Error().Err(err).Int("statusId", req.StatusID).Msg("Failed to validate inventory status")
		return nil, err
	}

	inventory, err := s.repo.Update(ctx, inventoryID, req.AdjustmentDate, req.StatusID, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", inventoryID).Int("userId", userID).Msg("Failed to update inventory")
		return nil, err
	}

	log.Info().Int("inventoryId", inventoryID).Int("userId", userID).Msg("Inventory updated successfully")
	return &dto.InventoryResponse{
		InventoryID:    inventory.InventoryID,
		AdjustmentDate: inventory.AdjustmentDate,
		StatusID:       inventory.StatusID,
		Notes:          inventory.Notes,
		CreatedBy:      inventory.CreatedBy,
		CreatedAt:      inventory.CreatedAt,
		UpdatedBy:      inventory.UpdatedBy,
		UpdatedAt:      inventory.UpdatedAt,
	}, nil
}

func (s *InventoryService) Delete(ctx context.Context, inventoryID int) error {
	err := s.repo.Delete(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", inventoryID).Msg("Failed to delete inventory")
		return err
	}

	log.Info().Int("inventoryId", inventoryID).Msg("Inventory deleted successfully")
	return nil
}
