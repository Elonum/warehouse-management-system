package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type InventoryService struct {
	repo                *repository.InventoryRepository
	inventoryStatusRepo *repository.InventoryStatusRepository
	inventoryItemRepo   *repository.InventoryItemRepository
}

func NewInventoryService(repo *repository.InventoryRepository, inventoryStatusRepo *repository.InventoryStatusRepository, inventoryItemRepo *repository.InventoryItemRepository) *InventoryService {
	return &InventoryService{
		repo:                repo,
		inventoryStatusRepo: inventoryStatusRepo,
		inventoryItemRepo:   inventoryItemRepo,
	}
}

func (s *InventoryService) GetByID(ctx context.Context, inventoryID uuid.UUID) (*dto.InventoryResponse, error) {
	inventory, err := s.repo.GetByID(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to get inventory by ID")
		return nil, err
	}

	var updatedByStr *string
	if inventory.UpdatedBy != nil {
		str := inventory.UpdatedBy.String()
		updatedByStr = &str
	}

	items, err := s.inventoryItemRepo.GetByInventoryID(ctx, inventoryID)
	if err != nil {
		log.Warn().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to get inventory items for totals")
	}

	totalReceiptQty := 0
	totalWriteOffQty := 0
	for _, item := range items {
		totalReceiptQty += item.ReceiptQty
		totalWriteOffQty += item.WriteOffQty
	}

	return &dto.InventoryResponse{
		InventoryID:     inventory.InventoryID.String(),
		AdjustmentDate:  inventory.AdjustmentDate,
		StatusID:        inventory.StatusID.String(),
		Notes:           inventory.Notes,
		CreatedBy:       inventory.CreatedBy.String(),
		CreatedAt:       inventory.CreatedAt,
		UpdatedBy:       updatedByStr,
		UpdatedAt:       inventory.UpdatedAt,
		TotalReceiptQty: totalReceiptQty,
		TotalWriteOffQty: totalWriteOffQty,
	}, nil
}

func (s *InventoryService) List(ctx context.Context, limit, offset int, statusID *uuid.UUID) ([]dto.InventoryResponse, error) {
	inventories, err := s.repo.List(ctx, limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("statusId", statusID).Msg("Failed to list inventories")
		return nil, err
	}

	result := make([]dto.InventoryResponse, 0, len(inventories))
	for _, inventory := range inventories {
		var updatedByStr *string
		if inventory.UpdatedBy != nil {
			str := inventory.UpdatedBy.String()
			updatedByStr = &str
		}

		items, err := s.inventoryItemRepo.GetByInventoryID(ctx, inventory.InventoryID)
		if err != nil {
			log.Warn().Err(err).Str("inventoryId", inventory.InventoryID.String()).Msg("Failed to get inventory items for totals")
		}

		totalReceiptQty := 0
		totalWriteOffQty := 0
		for _, item := range items {
			totalReceiptQty += item.ReceiptQty
			totalWriteOffQty += item.WriteOffQty
		}

		result = append(result, dto.InventoryResponse{
			InventoryID:     inventory.InventoryID.String(),
			AdjustmentDate:  inventory.AdjustmentDate,
			StatusID:        inventory.StatusID.String(),
			Notes:           inventory.Notes,
			CreatedBy:       inventory.CreatedBy.String(),
			CreatedAt:       inventory.CreatedAt,
			UpdatedBy:       updatedByStr,
			UpdatedAt:       inventory.UpdatedAt,
			TotalReceiptQty: totalReceiptQty,
			TotalWriteOffQty: totalWriteOffQty,
		})
	}

	return result, nil
}

func (s *InventoryService) Create(ctx context.Context, userID uuid.UUID, req dto.InventoryCreateRequest) (*dto.InventoryResponse, error) {
	statusID, err := uuid.Parse(req.StatusID)
	if err != nil {
		log.Warn().Str("statusId", req.StatusID).Msg("Invalid status ID format")
		return nil, repository.ErrInventoryStatusNotFound
	}
	_, err = s.inventoryStatusRepo.GetByID(ctx, statusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", req.StatusID).Msg("Inventory status not found")
			return nil, repository.ErrInventoryStatusNotFound
		}
		log.Error().Err(err).Str("statusId", req.StatusID).Msg("Failed to validate inventory status")
		return nil, err
	}

	inventory, err := s.repo.Create(ctx, req.AdjustmentDate, statusID, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Str("statusId", req.StatusID).Str("userId", userID.String()).Msg("Failed to create inventory")
		return nil, err
	}

	var updatedByStr *string
	if inventory.UpdatedBy != nil {
		str := inventory.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("inventoryId", inventory.InventoryID.String()).Str("statusId", req.StatusID).Str("userId", userID.String()).Msg("Inventory created successfully")
	return &dto.InventoryResponse{
		InventoryID:    inventory.InventoryID.String(),
		AdjustmentDate: inventory.AdjustmentDate,
		StatusID:       inventory.StatusID.String(),
		Notes:          inventory.Notes,
		CreatedBy:      inventory.CreatedBy.String(),
		CreatedAt:      inventory.CreatedAt,
		UpdatedBy:      updatedByStr,
		UpdatedAt:      inventory.UpdatedAt,
	}, nil
}

func (s *InventoryService) Update(ctx context.Context, inventoryID, userID uuid.UUID, req dto.InventoryUpdateRequest) (*dto.InventoryResponse, error) {
	statusID, err := uuid.Parse(req.StatusID)
	if err != nil {
		log.Warn().Str("statusId", req.StatusID).Msg("Invalid status ID format")
		return nil, repository.ErrInventoryStatusNotFound
	}
	_, err = s.inventoryStatusRepo.GetByID(ctx, statusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", req.StatusID).Msg("Inventory status not found")
			return nil, repository.ErrInventoryStatusNotFound
		}
		log.Error().Err(err).Str("statusId", req.StatusID).Msg("Failed to validate inventory status")
		return nil, err
	}

	inventory, err := s.repo.Update(ctx, inventoryID, req.AdjustmentDate, statusID, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Str("userId", userID.String()).Msg("Failed to update inventory")
		return nil, err
	}

	var updatedByStr *string
	if inventory.UpdatedBy != nil {
		str := inventory.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("inventoryId", inventoryID.String()).Str("userId", userID.String()).Msg("Inventory updated successfully")
	return &dto.InventoryResponse{
		InventoryID:    inventory.InventoryID.String(),
		AdjustmentDate: inventory.AdjustmentDate,
		StatusID:       inventory.StatusID.String(),
		Notes:          inventory.Notes,
		CreatedBy:      inventory.CreatedBy.String(),
		CreatedAt:      inventory.CreatedAt,
		UpdatedBy:      updatedByStr,
		UpdatedAt:      inventory.UpdatedAt,
	}, nil
}

func (s *InventoryService) Delete(ctx context.Context, inventoryID uuid.UUID) error {
	err := s.repo.Delete(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to delete inventory")
		return err
	}

	log.Info().Str("inventoryId", inventoryID.String()).Msg("Inventory deleted successfully")
	return nil
}
