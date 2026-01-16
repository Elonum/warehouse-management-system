package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type SupplierOrderItemService struct {
	repo          *repository.SupplierOrderItemRepository
	orderRepo     *repository.SupplierOrderRepository
	productRepo   *repository.ProductRepository
	warehouseRepo *repository.WarehouseRepository
}

func NewSupplierOrderItemService(repo *repository.SupplierOrderItemRepository, orderRepo *repository.SupplierOrderRepository, productRepo *repository.ProductRepository, warehouseRepo *repository.WarehouseRepository) *SupplierOrderItemService {
	return &SupplierOrderItemService{
		repo:          repo,
		orderRepo:     orderRepo,
		productRepo:   productRepo,
		warehouseRepo: warehouseRepo,
	}
}

func (s *SupplierOrderItemService) GetByID(ctx context.Context, itemID int) (*dto.SupplierOrderItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to get supplier order item by ID")
		return nil, err
	}

	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID,
		OrderID:         item.OrderID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		OrderedQty:      item.OrderedQty,
		ReceivedQty:     item.ReceivedQty,
		PurchasePrice:   item.PurchasePrice,
		TotalPrice:      item.TotalPrice,
		TotalWeight:     item.TotalWeight,
		TotalLogistics:  item.TotalLogistics,
		UnitLogistics:   item.UnitLogistics,
		UnitSelfCost:    item.UnitSelfCost,
		TotalSelfCost:   item.TotalSelfCost,
		FulfillmentCost: item.FulfillmentCost,
	}, nil
}

func (s *SupplierOrderItemService) GetByOrderID(ctx context.Context, orderID int) ([]dto.SupplierOrderItemResponse, error) {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to get supplier order items by order ID")
		return nil, err
	}

	result := make([]dto.SupplierOrderItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.SupplierOrderItemResponse{
			OrderItemID:     item.OrderItemID,
			OrderID:         item.OrderID,
			ProductID:       item.ProductID,
			WarehouseID:     item.WarehouseID,
			OrderedQty:      item.OrderedQty,
			ReceivedQty:     item.ReceivedQty,
			PurchasePrice:   item.PurchasePrice,
			TotalPrice:      item.TotalPrice,
			TotalWeight:     item.TotalWeight,
			TotalLogistics:  item.TotalLogistics,
			UnitLogistics:   item.UnitLogistics,
			UnitSelfCost:    item.UnitSelfCost,
			TotalSelfCost:   item.TotalSelfCost,
			FulfillmentCost: item.FulfillmentCost,
		})
	}

	return result, nil
}

func (s *SupplierOrderItemService) Create(ctx context.Context, userID int, req dto.SupplierOrderItemCreateRequest) (*dto.SupplierOrderItemResponse, error) {
	_, err := s.orderRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Int("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	_, err = s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
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

	if req.ReceivedQty > req.OrderedQty {
		log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Received quantity cannot exceed ordered quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx,
		req.OrderID,
		req.ProductID,
		req.WarehouseID,
		req.OrderedQty,
		req.ReceivedQty,
		req.TotalWeight,
		req.PurchasePrice,
		req.TotalPrice,
		req.TotalLogistics,
		req.UnitLogistics,
		req.UnitSelfCost,
		req.TotalSelfCost,
		req.FulfillmentCost,
	)
	if err != nil {
		log.Error().Err(err).Int("orderId", req.OrderID).Int("productId", req.ProductID).Int("userId", userID).Msg("Failed to create supplier order item")
		return nil, err
	}

	log.Info().Int("orderItemId", item.OrderItemID).Int("orderId", req.OrderID).Int("productId", req.ProductID).Int("userId", userID).Msg("Supplier order item created successfully")
	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID,
		OrderID:         item.OrderID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		OrderedQty:      item.OrderedQty,
		ReceivedQty:     item.ReceivedQty,
		PurchasePrice:   item.PurchasePrice,
		TotalPrice:      item.TotalPrice,
		TotalWeight:     item.TotalWeight,
		TotalLogistics:  item.TotalLogistics,
		UnitLogistics:   item.UnitLogistics,
		UnitSelfCost:    item.UnitSelfCost,
		TotalSelfCost:   item.TotalSelfCost,
		FulfillmentCost: item.FulfillmentCost,
	}, nil
}

func (s *SupplierOrderItemService) Update(ctx context.Context, itemID, userID int, req dto.SupplierOrderItemUpdateRequest) (*dto.SupplierOrderItemResponse, error) {
	_, err := s.orderRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Int("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	_, err = s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
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

	if req.ReceivedQty > req.OrderedQty {
		log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Received quantity cannot exceed ordered quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID,
		req.OrderID,
		req.ProductID,
		req.WarehouseID,
		req.OrderedQty,
		req.ReceivedQty,
		req.TotalWeight,
		req.PurchasePrice,
		req.TotalPrice,
		req.TotalLogistics,
		req.UnitLogistics,
		req.UnitSelfCost,
		req.TotalSelfCost,
		req.FulfillmentCost,
	)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Int("userId", userID).Msg("Failed to update supplier order item")
		return nil, err
	}

	log.Info().Int("itemId", itemID).Int("userId", userID).Msg("Supplier order item updated successfully")
	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID,
		OrderID:         item.OrderID,
		ProductID:       item.ProductID,
		WarehouseID:     item.WarehouseID,
		OrderedQty:      item.OrderedQty,
		ReceivedQty:     item.ReceivedQty,
		PurchasePrice:   item.PurchasePrice,
		TotalPrice:      item.TotalPrice,
		TotalWeight:     item.TotalWeight,
		TotalLogistics:  item.TotalLogistics,
		UnitLogistics:   item.UnitLogistics,
		UnitSelfCost:    item.UnitSelfCost,
		TotalSelfCost:   item.TotalSelfCost,
		FulfillmentCost: item.FulfillmentCost,
	}, nil
}

func (s *SupplierOrderItemService) Delete(ctx context.Context, itemID int) error {
	err := s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete supplier order item")
		return err
	}

	log.Info().Int("itemId", itemID).Msg("Supplier order item deleted successfully")
	return nil
}
