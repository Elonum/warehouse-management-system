package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/google/uuid"

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

// itemComputedFields holds all server-side computed fields for a supplier order item.
type itemComputedFields struct {
	UnitLogistics  *float64
	TotalLogistics *float64
	UnitSelfCost   *float64
	TotalSelfCost  *float64
}

// computeItemFields calculates logistics and self-cost for an item.
//
// Logistics formula (weight-proportional):
//
//	unit_logistics  = (item_weight_kg / order_weight_kg) * order_logistics_total
//	total_logistics = unit_logistics * ordered_qty
//
// Self-cost formula:
//
//	unit_self_cost  = purchase_price + unit_logistics
//	total_self_cost = unit_self_cost * received_qty   (cost of goods actually received)
//
// All fields are nil when the required inputs are absent (no logistics configured on the order).
func (s *SupplierOrderItemService) computeItemFields(
	ctx context.Context,
	orderID uuid.UUID,
	itemWeightGrams int,
	orderedQty int,
	receivedQty int,
	purchasePrice *float64,
) (itemComputedFields, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return itemComputedFields{}, err
	}

	// --- logistics ---
	var unitLogistics, totalLogistics *float64

	if order.LogisticsTotal != nil && *order.LogisticsTotal > 0 &&
		order.OrderItemWeight != nil && *order.OrderItemWeight > 0 {

		itemWeightKg := float64(itemWeightGrams) / 1000.0
		ul := (itemWeightKg / *order.OrderItemWeight) * *order.LogisticsTotal
		tl := ul * float64(orderedQty)
		unitLogistics = &ul
		totalLogistics = &tl
	}

	// --- self-cost ---
	// unit_self_cost = purchase_price + unit_logistics (both must be present)
	var unitSelfCost, totalSelfCost *float64

	if purchasePrice != nil && unitLogistics != nil {
		usc := *purchasePrice + *unitLogistics
		tsc := usc * float64(receivedQty)
		unitSelfCost = &usc
		totalSelfCost = &tsc
	} else if purchasePrice != nil {
		// logistics not configured yet — self-cost equals purchase price only
		usc := *purchasePrice
		tsc := usc * float64(receivedQty)
		unitSelfCost = &usc
		totalSelfCost = &tsc
	}

	return itemComputedFields{
		UnitLogistics:  unitLogistics,
		TotalLogistics: totalLogistics,
		UnitSelfCost:   unitSelfCost,
		TotalSelfCost:  totalSelfCost,
	}, nil
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

// itemToResponse converts a repository SupplierOrderItem to a DTO response.
// Centralised to avoid repetition and ensure all fields are always mapped.
func itemToResponse(item *repository.SupplierOrderItem) *dto.SupplierOrderItemResponse {
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
	}
}

func (s *SupplierOrderItemService) GetByID(ctx context.Context, itemID uuid.UUID) (*dto.SupplierOrderItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to get supplier order item by ID")
		return nil, err
	}
	return itemToResponse(item), nil
}

func (s *SupplierOrderItemService) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]dto.SupplierOrderItemResponse, error) {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to get supplier order items by order ID")
		return nil, err
	}

	result := make([]dto.SupplierOrderItemResponse, 0, len(items))
	for i := range items {
		result = append(result, *itemToResponse(&items[i]))
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

	// Server-side computation: logistics + self-cost (overrides any client-provided values)
	computed, calcErr := s.computeItemFields(ctx, orderID, req.TotalWeight, req.OrderedQty, req.ReceivedQty, req.PurchasePrice)
	if calcErr != nil {
		log.Warn().Err(calcErr).Str("orderId", req.OrderID).Msg("Failed to compute item fields, proceeding without computed values")
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
		computed.TotalLogistics,
		computed.UnitLogistics,
		computed.UnitSelfCost,
		computed.TotalSelfCost,
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
	return itemToResponse(item), nil
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

	// Server-side computation: logistics + self-cost (overrides any client-provided values)
	computed, calcErr := s.computeItemFields(ctx, orderID, req.TotalWeight, req.OrderedQty, req.ReceivedQty, req.PurchasePrice)
	if calcErr != nil {
		log.Warn().Err(calcErr).Str("orderId", req.OrderID).Msg("Failed to compute item fields, proceeding without computed values")
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
		computed.TotalLogistics,
		computed.UnitLogistics,
		computed.UnitSelfCost,
		computed.TotalSelfCost,
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
	return itemToResponse(item), nil
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

// RecalculateLogisticsForAllItems recalculates logistics AND self-cost for all items in an order.
// Must be called whenever order.logistics_total or order.order_item_weight changes.
func (s *SupplierOrderItemService) RecalculateLogisticsForAllItems(ctx context.Context, orderID uuid.UUID) error {
	items, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load order items for recalculation")
		return err
	}

	if len(items) == 0 {
		return nil
	}

	updates := make(map[uuid.UUID]repository.ComputedItemFields, len(items))

	for _, item := range items {
		computed, calcErr := s.computeItemFields(ctx, orderID, item.TotalWeight, item.OrderedQty, item.ReceivedQty, item.PurchasePrice)
		if calcErr != nil {
			log.Warn().Err(calcErr).Str("itemId", item.OrderItemID.String()).Msg("Failed to compute fields for item during recalculation, skipping")
			continue
		}
		updates[item.OrderItemID] = repository.ComputedItemFields{
			UnitLogistics:  computed.UnitLogistics,
			TotalLogistics: computed.TotalLogistics,
			UnitSelfCost:   computed.UnitSelfCost,
			TotalSelfCost:  computed.TotalSelfCost,
		}
	}

	if len(updates) == 0 {
		return nil
	}

	if err := s.repo.UpdateComputedFieldsForAllOrderItems(ctx, orderID, updates); err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to update computed fields for all order items")
		return err
	}

	log.Info().Str("orderId", orderID.String()).Int("itemsUpdated", len(updates)).Msg("Recalculated logistics and self-cost for all order items")
	return nil
}
