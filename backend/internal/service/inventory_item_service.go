package service

import (
	"context"

	"github.com/google/uuid"
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

func (s *InventoryItemService) GetByID(ctx context.Context, itemID uuid.UUID) (*dto.InventoryItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to get inventory item by ID")
		return nil, err
	}

	var productIDStr *string
	if item.ProductID != nil {
		str := item.ProductID.String()
		productIDStr = &str
	}

	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID.String(),
		InventoryID:     item.InventoryID.String(),
		ProductID:       productIDStr,
		WarehouseID:     item.WarehouseID.String(),
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) GetByInventoryID(ctx context.Context, inventoryID uuid.UUID) ([]dto.InventoryItemResponse, error) {
	items, err := s.repo.GetByInventoryID(ctx, inventoryID)
	if err != nil {
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to get inventory items by inventory ID")
		return nil, err
	}

	result := make([]dto.InventoryItemResponse, 0, len(items))
	for _, item := range items {
		var productIDStr *string
		if item.ProductID != nil {
			str := item.ProductID.String()
			productIDStr = &str
		}

		result = append(result, dto.InventoryItemResponse{
			InventoryItemID: item.InventoryItemID.String(),
			InventoryID:     item.InventoryID.String(),
			ProductID:       productIDStr,
			WarehouseID:     item.WarehouseID.String(),
			ReceiptQty:      item.ReceiptQty,
			WriteOffQty:     item.WriteOffQty,
			Reason:          item.Reason,
		})
	}

	return result, nil
}

func (s *InventoryItemService) Create(ctx context.Context, req dto.InventoryItemCreateRequest) (*dto.InventoryItemResponse, error) {
	inventoryID, err := uuid.Parse(req.InventoryID)
	if err != nil {
		log.Warn().Str("inventoryId", req.InventoryID).Msg("Invalid inventory ID format")
		return nil, repository.ErrInventoryNotFound
	}
	_, err = s.inventoryRepo.GetByID(ctx, inventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Str("inventoryId", req.InventoryID).Msg("Inventory not found")
			return nil, repository.ErrInventoryNotFound
		}
		log.Error().Err(err).Str("inventoryId", req.InventoryID).Msg("Failed to validate inventory")
		return nil, err
	}

	var productID *uuid.UUID
	if req.ProductID != nil && *req.ProductID != "" {
		id, err := uuid.Parse(*req.ProductID)
		if err != nil {
			log.Warn().Str("productId", *req.ProductID).Msg("Invalid product ID format")
			return nil, repository.ErrProductNotFound
		}
		productID = &id

		_, err = s.productRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Str("productId", *req.ProductID).Msg("Product not found")
				return nil, repository.ErrProductNotFound
			}
			log.Error().Err(err).Str("productId", *req.ProductID).Msg("Failed to validate product")
			return nil, err
		}
	}

	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		log.Warn().Str("warehouseId", req.WarehouseID).Msg("Invalid warehouse ID format")
		return nil, repository.ErrWarehouseNotFound
	}
	_, err = s.warehouseRepo.GetByID(ctx, warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
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

	item, err := s.repo.Create(ctx, inventoryID, productID, warehouseID, req.ReceiptQty, req.WriteOffQty, req.Reason)
	if err != nil {
		log.Error().Err(err).Str("inventoryId", req.InventoryID).Str("warehouseId", req.WarehouseID).Msg("Failed to create inventory item")
		return nil, err
	}

	var productIDStr *string
	if item.ProductID != nil {
		str := item.ProductID.String()
		productIDStr = &str
	}

	log.Info().Str("inventoryItemId", item.InventoryItemID.String()).Str("inventoryId", req.InventoryID).Str("warehouseId", req.WarehouseID).Msg("Inventory item created successfully")
	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID.String(),
		InventoryID:     item.InventoryID.String(),
		ProductID:       productIDStr,
		WarehouseID:     item.WarehouseID.String(),
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) Update(ctx context.Context, itemID uuid.UUID, req dto.InventoryItemUpdateRequest) (*dto.InventoryItemResponse, error) {
	inventoryID, err := uuid.Parse(req.InventoryID)
	if err != nil {
		log.Warn().Str("inventoryId", req.InventoryID).Msg("Invalid inventory ID format")
		return nil, repository.ErrInventoryNotFound
	}
	_, err = s.inventoryRepo.GetByID(ctx, inventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Str("inventoryId", req.InventoryID).Msg("Inventory not found")
			return nil, repository.ErrInventoryNotFound
		}
		log.Error().Err(err).Str("inventoryId", req.InventoryID).Msg("Failed to validate inventory")
		return nil, err
	}

	var productID *uuid.UUID
	if req.ProductID != nil && *req.ProductID != "" {
		id, err := uuid.Parse(*req.ProductID)
		if err != nil {
			log.Warn().Str("productId", *req.ProductID).Msg("Invalid product ID format")
			return nil, repository.ErrProductNotFound
		}
		productID = &id

		_, err = s.productRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Str("productId", *req.ProductID).Msg("Product not found")
				return nil, repository.ErrProductNotFound
			}
			log.Error().Err(err).Str("productId", *req.ProductID).Msg("Failed to validate product")
			return nil, err
		}
	}

	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		log.Warn().Str("warehouseId", req.WarehouseID).Msg("Invalid warehouse ID format")
		return nil, repository.ErrWarehouseNotFound
	}
	_, err = s.warehouseRepo.GetByID(ctx, warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			return nil, repository.ErrWarehouseNotFound
		}
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Msg("Failed to validate warehouse")
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

	item, err := s.repo.Update(ctx, itemID, inventoryID, productID, warehouseID, req.ReceiptQty, req.WriteOffQty, req.Reason)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to update inventory item")
		return nil, err
	}

	var productIDStr *string
	if item.ProductID != nil {
		str := item.ProductID.String()
		productIDStr = &str
	}

	log.Info().Str("itemId", itemID.String()).Msg("Inventory item updated successfully")
	return &dto.InventoryItemResponse{
		InventoryItemID: item.InventoryItemID.String(),
		InventoryID:     item.InventoryID.String(),
		ProductID:       productIDStr,
		WarehouseID:     item.WarehouseID.String(),
		ReceiptQty:      item.ReceiptQty,
		WriteOffQty:     item.WriteOffQty,
		Reason:          item.Reason,
	}, nil
}

func (s *InventoryItemService) Delete(ctx context.Context, itemID uuid.UUID) error {
	err := s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to delete inventory item")
		return err
	}

	log.Info().Str("itemId", itemID.String()).Msg("Inventory item deleted successfully")
	return nil
}
