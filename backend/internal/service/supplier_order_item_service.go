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

// calculateItemLogistics calculates logistics for an item based on weight distribution
// Formula: unit_logistics = (item_weight_kg / total_order_weight_kg) * total_order_logistics
// Returns unit_logistics and total_logistics (unit_logistics * ordered_qty)
func (s *SupplierOrderItemService) calculateItemLogistics(ctx context.Context, orderID uuid.UUID, itemWeightGrams int, orderedQty int) (*float64, *float64, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, nil, err
	}

	// If order logistics or weight is not set, return nil
	if order.LogisticsTotal == nil || *order.LogisticsTotal <= 0 {
		return nil, nil, nil
	}
	if order.OrderItemWeight == nil || *order.OrderItemWeight <= 0 {
		return nil, nil, nil
	}

	// Convert item weight from grams to kg
	itemWeightKg := float64(itemWeightGrams) / 1000.0
	totalOrderWeightKg := *order.OrderItemWeight
	totalOrderLogistics := *order.LogisticsTotal

	// Calculate unit logistics: (item_weight_kg / total_order_weight_kg) * total_order_logistics
	unitLogistics := (itemWeightKg / totalOrderWeightKg) * totalOrderLogistics

	// Calculate total logistics: unit_logistics * ordered_qty
	totalLogistics := unitLogistics * float64(orderedQty)

	return &unitLogistics, &totalLogistics, nil
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
		totalWeight += float64(item.TotalWeight) // TotalWeight is in grams
		if item.TotalPrice != nil {
			totalCost += *item.TotalPrice
		}
		if item.TotalLogistics != nil {
			totalLogistics += *item.TotalLogistics
		}
	}

	// Convert total weight from grams to kilograms for storage in order_item_weight
	var weightPtr *float64
	if positionsQty > 0 && totalWeight > 0 {
		weightInKg := totalWeight / 1000.0
		weightPtr = &weightInKg
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

	// Calculate logistics automatically based on weight distribution
	// Override user-provided logistics if order has logistics_total and order_item_weight
	unitLogistics := req.UnitLogistics
	totalLogistics := req.TotalLogistics
	calculatedUnitLogistics, calculatedTotalLogistics, calcErr := s.calculateItemLogistics(ctx, orderID, req.TotalWeight, req.OrderedQty)
	if calcErr != nil {
		log.Warn().Err(calcErr).Str("orderId", req.OrderID).Msg("Failed to calculate item logistics, using provided values")
	} else if calculatedUnitLogistics != nil && calculatedTotalLogistics != nil {
		// Use calculated values instead of user-provided ones
		unitLogistics = calculatedUnitLogistics
		totalLogistics = calculatedTotalLogistics
		log.Debug().
			Float64("calculatedUnitLogistics", *calculatedUnitLogistics).
			Float64("calculatedTotalLogistics", *calculatedTotalLogistics).
			Str("orderId", req.OrderID).
			Msg("Calculated logistics for order item")
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
		totalLogistics,
		unitLogistics,
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

	// Calculate logistics automatically based on weight distribution
	// Override user-provided logistics if order has logistics_total and order_item_weight
	unitLogistics := req.UnitLogistics
	totalLogistics := req.TotalLogistics
	calculatedUnitLogistics, calculatedTotalLogistics, calcErr := s.calculateItemLogistics(ctx, orderID, req.TotalWeight, req.OrderedQty)
	if calcErr != nil {
		log.Warn().Err(calcErr).Str("orderId", req.OrderID).Msg("Failed to calculate item logistics, using provided values")
	} else if calculatedUnitLogistics != nil && calculatedTotalLogistics != nil {
		// Use calculated values instead of user-provided ones
		unitLogistics = calculatedUnitLogistics
		totalLogistics = calculatedTotalLogistics
		log.Debug().
			Float64("calculatedUnitLogistics", *calculatedUnitLogistics).
			Float64("calculatedTotalLogistics", *calculatedTotalLogistics).
			Str("orderId", req.OrderID).
			Msg("Calculated logistics for order item update")
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
		totalLogistics,
		unitLogistics,
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

// RecalculateLogisticsForAllItems recalculates logistics for all items in an order
// This should be called when order logistics_total or order_item_weight changes
func (s *SupplierOrderItemService) RecalculateLogisticsForAllItems(ctx context.Context, orderID uuid.UUID) error {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load order items for logistics recalculation")
		return err
	}

	if len(items) == 0 {
		return nil
	}

	updates := make(map[uuid.UUID]struct {
		UnitLogistics  *float64
		TotalLogistics *float64
	})

	for _, item := range items {
		unitLogistics, totalLogistics, calcErr := s.calculateItemLogistics(ctx, orderID, item.TotalWeight, item.OrderedQty)
		if calcErr != nil {
			log.Warn().Err(calcErr).Str("itemId", item.OrderItemID.String()).Msg("Failed to calculate logistics for item, skipping")
			continue
		}
		if unitLogistics != nil && totalLogistics != nil {
			updates[item.OrderItemID] = struct {
				UnitLogistics  *float64
				TotalLogistics *float64
			}{
				UnitLogistics:  unitLogistics,
				TotalLogistics: totalLogistics,
			}
		}
	}

	if len(updates) > 0 {
		if err := s.repo.UpdateLogisticsForAllOrderItems(ctx, orderID, updates); err != nil {
			log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to update logistics for all order items")
			return err
		}
		log.Info().Str("orderId", orderID.String()).Int("itemsUpdated", len(updates)).Msg("Recalculated logistics for all order items")
	}

	return nil
}
