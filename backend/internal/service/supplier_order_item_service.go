package service

import (
	"context"

	"github.com/google/uuid"
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

// recalcAndUpdateOrderAggregates aggregates items of an order and persists totals into supplier_orders.
func (s *SupplierOrderItemService) recalcAndUpdateOrderAggregates(ctx context.Context, orderID, userID uuid.UUID) error {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load order items for aggregation")
		return err
	}

	positionsQty := len(items)
	totalQty := 0
	var totalWeight float64
	var totalCost float64
	var totalLogistics float64

	for _, item := range items {
		totalQty += item.OrderedQty
		totalWeight += float64(item.TotalWeight)
		if item.TotalPrice != nil {
			totalCost += *item.TotalPrice
		}
		if item.TotalLogistics != nil {
			totalLogistics += *item.TotalLogistics
		}
	}

	var weightPtr *float64
	if positionsQty > 0 {
		weightPtr = &totalWeight
	}

	var costPtr *float64
	if positionsQty > 0 {
		costPtr = &totalCost
	}

	var logisticsPtr *float64
	if positionsQty > 0 {
		logisticsPtr = &totalLogistics
	}

	if err := s.orderRepo.UpdateAggregates(ctx, orderID, positionsQty, totalQty, weightPtr, costPtr, logisticsPtr, &userID); err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to update supplier order aggregates")
		return err
	}

	return nil
}

func (s *SupplierOrderItemService) GetByID(ctx context.Context, itemID uuid.UUID) (*dto.SupplierOrderItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to get supplier order item by ID")
		return nil, err
	}

	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID.String(),
		OrderID:         item.OrderID.String(),
		ProductID:       item.ProductID.String(),
		WarehouseID:     item.WarehouseID.String(),
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

func (s *SupplierOrderItemService) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]dto.SupplierOrderItemResponse, error) {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to get supplier order items by order ID")
		return nil, err
	}

	result := make([]dto.SupplierOrderItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.SupplierOrderItemResponse{
			OrderItemID:     item.OrderItemID.String(),
			OrderID:         item.OrderID.String(),
			ProductID:       item.ProductID.String(),
			WarehouseID:     item.WarehouseID.String(),
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

func (s *SupplierOrderItemService) Create(ctx context.Context, userID uuid.UUID, req dto.SupplierOrderItemCreateRequest) (*dto.SupplierOrderItemResponse, error) {
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		log.Warn().Str("orderId", req.OrderID).Msg("Invalid order ID format")
		return nil, repository.ErrSupplierOrderNotFound
	}
	_, err = s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
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

	if req.ReceivedQty > req.OrderedQty {
		log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Received quantity cannot exceed ordered quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx,
		orderID,
		productID,
		warehouseID,
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
		log.Error().Err(err).Str("orderId", req.OrderID).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Failed to create supplier order item")
		return nil, err
	}

	if aggErr := s.recalcAndUpdateOrderAggregates(ctx, orderID, userID); aggErr != nil {
		log.Error().Err(aggErr).Str("orderId", req.OrderID).Msg("Failed to recalc aggregates after item create")
	}

	log.Info().Str("orderItemId", item.OrderItemID.String()).Str("orderId", req.OrderID).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Supplier order item created successfully")
	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID.String(),
		OrderID:         item.OrderID.String(),
		ProductID:       item.ProductID.String(),
		WarehouseID:     item.WarehouseID.String(),
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

func (s *SupplierOrderItemService) Update(ctx context.Context, itemID, userID uuid.UUID, req dto.SupplierOrderItemUpdateRequest) (*dto.SupplierOrderItemResponse, error) {
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		log.Warn().Str("orderId", req.OrderID).Msg("Invalid order ID format")
		return nil, repository.ErrSupplierOrderNotFound
	}
	_, err = s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
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

	if req.ReceivedQty > req.OrderedQty {
		log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Received quantity cannot exceed ordered quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID,
		orderID,
		productID,
		warehouseID,
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
		log.Error().Err(err).Str("itemId", itemID.String()).Str("userId", userID.String()).Msg("Failed to update supplier order item")
		return nil, err
	}

	if aggErr := s.recalcAndUpdateOrderAggregates(ctx, orderID, userID); aggErr != nil {
		log.Error().Err(aggErr).Str("orderId", req.OrderID).Msg("Failed to recalc aggregates after item update")
	}

	log.Info().Str("itemId", itemID.String()).Str("userId", userID.String()).Msg("Supplier order item updated successfully")
	return &dto.SupplierOrderItemResponse{
		OrderItemID:     item.OrderItemID.String(),
		OrderID:         item.OrderID.String(),
		ProductID:       item.ProductID.String(),
		WarehouseID:     item.WarehouseID.String(),
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

func (s *SupplierOrderItemService) Delete(ctx context.Context, itemID, userID uuid.UUID) error {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to load supplier order item before deletion")
		return err
	}

	err = s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to delete supplier order item")
		return err
	}

	if aggErr := s.recalcAndUpdateOrderAggregates(ctx, item.OrderID, userID); aggErr != nil {
		log.Error().Err(aggErr).Str("orderId", item.OrderID.String()).Msg("Failed to recalc aggregates after item delete")
	}

	log.Info().Str("itemId", itemID.String()).Msg("Supplier order item deleted successfully")
	return nil
}
