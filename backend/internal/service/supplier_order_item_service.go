package service

import (
	"context"
	"math"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/google/uuid"

	"github.com/rs/zerolog/log"
)


type SupplierOrderItemService struct {
	repo            *repository.SupplierOrderItemRepository
	orderRepo       *repository.SupplierOrderRepository
	orderStatusRepo *repository.OrderStatusRepository
	productRepo     *repository.ProductRepository
	warehouseRepo   *repository.WarehouseRepository
}

// isOrderFinal checks if the given order has a final (completed) status.
// Returns false if the order has no status or if status lookup fails.
func (s *SupplierOrderItemService) isOrderFinal(ctx context.Context, orderID uuid.UUID) bool {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return false
	}
	if order.StatusID == nil {
		return false
	}
	status, err := s.orderStatusRepo.GetByID(ctx, *order.StatusID)
	if err != nil {
		return false
	}
	return status.IsFinal
}

func NewSupplierOrderItemService(
	repo *repository.SupplierOrderItemRepository,
	orderRepo *repository.SupplierOrderRepository,
	orderStatusRepo *repository.OrderStatusRepository,
	productRepo *repository.ProductRepository,
	warehouseRepo *repository.WarehouseRepository,
) *SupplierOrderItemService {
	return &SupplierOrderItemService{
		repo:            repo,
		orderRepo:       orderRepo,
		orderStatusRepo: orderStatusRepo,
		productRepo:     productRepo,
		warehouseRepo:   warehouseRepo,
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
// Logistics distribution (weight-proportional, consistent at order level):
//
//  share_i           = item_weight_kg / total_order_weight_kg
//  total_logistics_i = share_i * order_logistics_total
//  unit_logistics_i  = total_logistics_i / max(received_qty, ordered_qty)
//
// This guarantees that the sum of total_logistics_i across all items is approximately
// equal to order.logistics_total (up to rounding), and unit logistics is per piece.
//
// Self-cost formula:
//
//  purchase_total_i      = item_total_price (or purchase_price * ordered_qty)
//  unit_purchase_cost    = purchase_total_i / received_qty
//  unit_self_cost        = unit_purchase_cost + unit_logistics_i
//  total_self_cost       = unit_self_cost * received_qty
//
// Self-cost is only computed when there are actually received goods (received_qty > 0);
// otherwise it remains nil and is not shown in reports.
func (s *SupplierOrderItemService) computeItemFields(
	ctx context.Context,
	orderID uuid.UUID,
	itemWeightGrams int,
	orderedQty int,
	receivedQty int,
	purchasePrice *float64,
	totalPrice *float64,
) (itemComputedFields, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return itemComputedFields{}, err
	}

	// --- logistics ---
	// total_logistics_i = share_i * order_logistics_total
	// unit_logistics_i  = total_logistics_i / max(received_qty, ordered_qty)
	var unitLogistics, totalLogistics *float64

	if order.LogisticsTotal != nil && *order.LogisticsTotal > 0 &&
		order.OrderItemWeight != nil && *order.OrderItemWeight > 0 &&
		itemWeightGrams > 0 {

		itemWeightKg := float64(itemWeightGrams) / 1000.0
		totalOrderWeightKg := *order.OrderItemWeight
		if totalOrderWeightKg > 0 {
			share := itemWeightKg / totalOrderWeightKg
			if share > 0 {
				tl := *order.LogisticsTotal * share
				totalLogistics = &tl

				qtyForUnit := receivedQty
				if qtyForUnit <= 0 {
					qtyForUnit = orderedQty
				}
				if qtyForUnit > 0 {
					ul := tl / float64(qtyForUnit)
					unitLogistics = &ul
				}
			}
		}
	}

	// --- self-cost ---
	var unitSelfCost, totalSelfCost *float64

	// Self-cost is meaningful only when the goods are received.
	if receivedQty > 0 {
		// Determine total purchase sum for the item.
		var purchaseTotal float64
		if totalPrice != nil {
			purchaseTotal = *totalPrice
		} else if purchasePrice != nil {
			purchaseTotal = *purchasePrice * float64(orderedQty)
		}

		if purchaseTotal > 0 {
			unitPurchase := purchaseTotal / float64(receivedQty)
			var logisticsPerUnit float64
			if unitLogistics != nil {
				logisticsPerUnit = *unitLogistics
			}

			usc := unitPurchase + logisticsPerUnit
			tsc := usc * float64(receivedQty)
			unitSelfCost = &usc
			totalSelfCost = &tsc
		}
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

	if err := s.orderRepo.UpdateAggregates(ctx, orderID, positionsQty, totalQty, weightPtr, costPtr, &userID); err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to update supplier order aggregates")
		return err
	}

	// After aggregates are updated (including total order weight), recalculate logistics
	// and self-cost for all items if the order has logistics configured.
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load supplier order for post-aggregate logistics recalculation")
		// Aggregates are already updated; do not fail hard, just stop here.
		return nil
	}

	if order.LogisticsTotal != nil && *order.LogisticsTotal > 0 &&
		order.OrderItemWeight != nil && *order.OrderItemWeight > 0 {

		if recalcErr := s.RecalculateLogisticsForAllItems(ctx, orderID); recalcErr != nil {
			log.Warn().Err(recalcErr).Str("orderId", orderID.String()).Msg("Failed to recalculate logistics for all items after aggregates update")
		}
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

	// Prevent modifications for completed orders
	if s.isOrderFinal(ctx, orderID) {
		log.Warn().Str("orderId", orderID.String()).Msg("Attempt to create item for completed supplier order")
		return nil, ErrSupplierOrderCompleted
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
	computed, calcErr := s.computeItemFields(ctx, orderID, req.TotalWeight, req.OrderedQty, req.ReceivedQty, req.PurchasePrice, req.TotalPrice)
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

	// Prevent modifications for completed orders
	if s.isOrderFinal(ctx, orderID) {
		log.Warn().Str("orderId", orderID.String()).Msg("Attempt to update item for completed supplier order")
		return nil, ErrSupplierOrderCompleted
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
	computed, calcErr := s.computeItemFields(ctx, orderID, req.TotalWeight, req.OrderedQty, req.ReceivedQty, req.PurchasePrice, req.TotalPrice)
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

	// Prevent modifications for completed orders
	if s.isOrderFinal(ctx, item.OrderID) {
		log.Warn().Str("orderId", item.OrderID.String()).Str("itemId", itemID.String()).Msg("Attempt to delete item from completed supplier order")
		return ErrSupplierOrderCompleted
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

// TransferItemsToSubOrder moves or splits items from a parent order into a sub-order.
// It operates on ordered quantities only; already received quantities are never moved.
// For each transfer:
//   - if Quantity is nil, the entire available (not yet received) quantity is moved;
//   - otherwise, Quantity must be > 0 and not exceed the available quantity.
// After all updates, aggregates and computed fields for both orders are recalculated.
func (s *SupplierOrderItemService) TransferItemsToSubOrder(
	ctx context.Context,
	parentOrderID, subOrderID, userID uuid.UUID,
	transfers []dto.SupplierSubOrderItemTransfer,
) error {
	if len(transfers) == 0 {
		return nil
	}

	// Prevent transfers if parent or sub-order is already completed
	if s.isOrderFinal(ctx, parentOrderID) {
		log.Warn().Str("parentOrderId", parentOrderID.String()).Msg("Attempt to transfer items from completed parent supplier order")
		return ErrSupplierOrderCompleted
	}
	if s.isOrderFinal(ctx, subOrderID) {
		log.Warn().Str("subOrderId", subOrderID.String()).Msg("Attempt to transfer items into completed sub-order")
		return ErrSupplierOrderCompleted
	}

	items, err := s.repo.GetByOrderID(ctx, parentOrderID)
	if err != nil {
		log.Error().Err(err).Str("parentOrderId", parentOrderID.String()).Msg("Failed to load parent order items for transfer to sub-order")
		return err
	}

	if len(items) == 0 {
		return repository.ErrSupplierOrderItemNotFound
	}

	itemByID := make(map[uuid.UUID]repository.SupplierOrderItem, len(items))
	for _, it := range items {
		itemByID[it.OrderItemID] = it
	}

	for _, tr := range transfers {
		itemID, parseErr := uuid.Parse(tr.OrderItemID)
		if parseErr != nil {
			log.Warn().Str("orderItemId", tr.OrderItemID).Msg("Invalid order item ID format for transfer")
			return repository.ErrSupplierOrderItemNotFound
		}

		item, ok := itemByID[itemID]
		if !ok {
			log.Warn().Str("orderItemId", itemID.String()).Msg("Parent order item not found for transfer")
			return repository.ErrSupplierOrderItemNotFound
		}

		// Available quantity to move is the part that has not yet been received.
		available := item.OrderedQty - item.ReceivedQty
		if available <= 0 {
			log.Warn().
				Str("orderItemId", item.OrderItemID.String()).
				Int("orderedQty", item.OrderedQty).
				Int("receivedQty", item.ReceivedQty).
				Msg("No available quantity to transfer to sub-order")
			return repository.ErrInvalidQuantity
		}

		var moveQty int
		if tr.Quantity == nil {
			moveQty = available
		} else {
			if *tr.Quantity <= 0 {
				log.Warn().
					Str("orderItemId", item.OrderItemID.String()).
					Int("requestedQty", *tr.Quantity).
					Msg("Requested transfer quantity must be positive")
				return repository.ErrInvalidQuantity
			}
			if *tr.Quantity > available {
				log.Warn().
					Str("orderItemId", item.OrderItemID.String()).
					Int("requestedQty", *tr.Quantity).
					Int("availableQty", available).
					Msg("Requested transfer quantity exceeds available quantity")
				return repository.ErrInvalidQuantity
			}
			moveQty = *tr.Quantity
		}

		if moveQty == 0 {
			continue
		}

		// Full move: just reassign the order_id to the sub-order.
		if moveQty == item.OrderedQty {
			_, err := s.repo.Update(ctx,
				item.OrderItemID,
				subOrderID,
				item.ProductID,
				item.WarehouseID,
				item.OrderedQty,
				item.ReceivedQty,
				item.TotalWeight,
				item.PurchasePrice,
				item.TotalPrice,
				item.TotalLogistics,
				item.UnitLogistics,
				item.UnitSelfCost,
				item.TotalSelfCost,
				item.FulfillmentCost,
			)
			if err != nil {
				log.Error().
					Err(err).
					Str("orderItemId", item.OrderItemID.String()).
					Str("parentOrderId", parentOrderID.String()).
					Str("subOrderId", subOrderID.String()).
					Msg("Failed to transfer full item to sub-order")
				return err
			}
			continue
		}

		// Partial move (split): adjust parent item and create a new item in the sub-order.
		newParentOrdered := item.OrderedQty - moveQty

		// Ensure parent still has enough ordered quantity to cover already received quantity.
		if newParentOrdered < item.ReceivedQty {
			log.Warn().
				Str("orderItemId", item.OrderItemID.String()).
				Int("newParentOrdered", newParentOrdered).
				Int("receivedQty", item.ReceivedQty).
				Msg("Splitting item would violate received <= ordered invariant")
			return repository.ErrInvalidQuantity
		}

		// Weight split (in grams) - keep total weight conserved and use integer arithmetic.
		moveWeight := int(math.Round(float64(item.TotalWeight) * float64(moveQty) / float64(item.OrderedQty)))
		parentWeight := item.TotalWeight - moveWeight

		// Total price split, if present: proportionally split by ordered quantity.
		var moveTotalPrice *float64
		var parentTotalPrice *float64
		if item.TotalPrice != nil {
			moveVal := *item.TotalPrice * float64(moveQty) / float64(item.OrderedQty)
			parentVal := *item.TotalPrice - moveVal
			moveTotalPrice = &moveVal
			parentTotalPrice = &parentVal
		}

		// Update parent item.
		_, err := s.repo.Update(ctx,
			item.OrderItemID,
			parentOrderID,
			item.ProductID,
			item.WarehouseID,
			newParentOrdered,
			item.ReceivedQty,
			parentWeight,
			item.PurchasePrice,
			parentTotalPrice,
			item.TotalLogistics,
			item.UnitLogistics,
			item.UnitSelfCost,
			item.TotalSelfCost,
			item.FulfillmentCost,
		)
		if err != nil {
			log.Error().
				Err(err).
				Str("orderItemId", item.OrderItemID.String()).
				Str("parentOrderId", parentOrderID.String()).
				Msg("Failed to update parent order item during transfer to sub-order")
			return err
		}

		// Create new item in sub-order. At this stage we set only structural fields;
		// logistics and self-cost will be recomputed after aggregates update.
		_, err = s.repo.Create(ctx,
			subOrderID,
			item.ProductID,
			item.WarehouseID,
			moveQty,
			0, // receivedQty starts from zero in the new sub-order
			moveWeight,
			item.PurchasePrice,
			moveTotalPrice,
			nil, // total_logistics
			nil, // unit_logistics
			nil, // unit_self_cost
			nil, // total_self_cost
			item.FulfillmentCost,
		)
		if err != nil {
			log.Error().
				Err(err).
				Str("parentOrderId", parentOrderID.String()).
				Str("subOrderId", subOrderID.String()).
				Str("productId", item.ProductID.String()).
				Msg("Failed to create split item in sub-order")
			return err
		}
	}

	// Recalculate aggregates and computed fields for both orders.
	if err := s.recalcAndUpdateOrderAggregates(ctx, parentOrderID, userID); err != nil {
		log.Error().Err(err).Str("orderId", parentOrderID.String()).Msg("Failed to recalc aggregates for parent order after transfer to sub-order")
		return err
	}
	if err := s.recalcAndUpdateOrderAggregates(ctx, subOrderID, userID); err != nil {
		log.Error().Err(err).Str("orderId", subOrderID.String()).Msg("Failed to recalc aggregates for sub-order after transfer")
		return err
	}

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
		computed, calcErr := s.computeItemFields(ctx, orderID, item.TotalWeight, item.OrderedQty, item.ReceivedQty, item.PurchasePrice, item.TotalPrice)
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
