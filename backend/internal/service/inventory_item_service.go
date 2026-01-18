package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type InventoryItemService struct {
	repo          *repository.InventoryItemRepository
	inventoryRepo *repository.InventoryRepository
	productRepo   *repository.ProductRepository
	warehouseRepo *repository.WarehouseRepository
}

func NewInventoryItemService(repo *repository.InventoryItemRepository, inventoryRepo *repository.InventoryRepository, productRepo *repository.ProductRepository, warehouseRepo *repository.WarehouseRepository) *InventoryItemService {
	return &InventoryItemService{
		repo:          repo,
		inventoryRepo: inventoryRepo,
		productRepo:   productRepo,
		warehouseRepo: warehouseRepo,
	}
}

func (s *InventoryItemService) GetByID(ctx context.Context, itemID int) (*dto.InventoryItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to get inventory item by ID")
		return nil, err
	}

	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID,
		InventoryID:     item.InventoryID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) GetByInventoryID(ctx context.Context, inventoryID int) ([]dto.InventoryItemResponse, error) {
	items, err := s.repo.GetByInventoryID(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", inventoryID).Msg("Failed to get inventory items by inventory ID")
		return nil, err
	}

	result := make([]dto.InventoryItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.InventoryItemResponse{
			InventoryItemID: item.InventoryItemID,
			InventoryID:     item.InventoryID,
			ProductID:       item.ProductID,
			WarehouseID:     item.WarehouseID,
			ReceiptQty:      item.ReceiptQty,
			WriteOffQty:     item.WriteOffQty,
			Reason:          item.Reason,
		})
	}

	return result, nil
}

func (s *InventoryItemService) Create(ctx context.Context, req dto.InventoryItemCreateRequest) (*dto.InventoryItemResponse, error) {
	_, err := s.inventoryRepo.GetByID(ctx, req.InventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Int("inventoryId", req.InventoryID).Msg("Inventory not found")
			return nil, repository.ErrInventoryNotFound
		}
		log.Error().Err(err).Int("inventoryId", req.InventoryID).Msg("Failed to validate inventory")
		return nil, err
	}

	if req.ProductID != nil {
		_, err = s.productRepo.GetByID(ctx, *req.ProductID)
		if err != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Int("productId", *req.ProductID).Msg("Product not found")
				return nil, repository.ErrProductNotFound
			}
			log.Error().Err(err).Int("productId", *req.ProductID).Msg("Failed to validate product")
			return nil, err
		}
	}

	_, err = s.warehouseRepo.GetByID(ctx, req.WarehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Int("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	if req.ReceiptQty < 0 {
		log.Warn().Int("receiptQty", req.ReceiptQty).Msg("Receipt quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	if req.WriteOffQty < 0 {
		log.Warn().Int("writeOffQty", req.WriteOffQty).Msg("Write-off quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx, req.InventoryID, req.ProductID, req.WarehouseID, req.ReceiptQty, req.WriteOffQty, req.Reason)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", req.InventoryID).Int("warehouseId", req.WarehouseID).Msg("Failed to create inventory item")
		return nil, err
	}

	log.Info().Int("inventoryItemId", item.InventoryItemID).Int("inventoryId", req.InventoryID).Int("warehouseId", req.WarehouseID).Msg("Inventory item created successfully")
	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID,
		InventoryID:     item.InventoryID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) Update(ctx context.Context, itemID int, req dto.InventoryItemUpdateRequest) (*dto.InventoryItemResponse, error) {
	_, err := s.inventoryRepo.GetByID(ctx, req.InventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Int("inventoryId", req.InventoryID).Msg("Inventory not found")
			return nil, repository.ErrInventoryNotFound
		}
		log.Error().Err(err).Int("inventoryId", req.InventoryID).Msg("Failed to validate inventory")
		return nil, err
	}

	if req.ProductID != nil {
		_, err = s.productRepo.GetByID(ctx, *req.ProductID)
		if err != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Int("productId", *req.ProductID).Msg("Product not found")
				return nil, repository.ErrProductNotFound
			}
			log.Error().Err(err).Int("productId", *req.ProductID).Msg("Failed to validate product")
			return nil, err
		}
	}

	_, err = s.warehouseRepo.GetByID(ctx, req.WarehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Int("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
		return nil, err
	}

	if req.ReceiptQty < 0 {
		log.Warn().Int("receiptQty", req.ReceiptQty).Msg("Receipt quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	if req.WriteOffQty < 0 {
		log.Warn().Int("writeOffQty", req.WriteOffQty).Msg("Write-off quantity must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID, req.InventoryID, req.ProductID, req.WarehouseID, req.ReceiptQty, req.WriteOffQty, req.Reason)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to update inventory item")
		return nil, err
	}

	log.Info().Int("itemId", itemID).Msg("Inventory item updated successfully")
	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID,
		InventoryID:     item.InventoryID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) Delete(ctx context.Context, itemID int) error {
	err := s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete inventory item")
		return err
	}

	log.Info().Int("itemId", itemID).Msg("Inventory item deleted successfully")
	return nil
}
