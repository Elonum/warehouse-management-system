package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

var (
	ErrSupplierOrderCompleted = errors.New("supplier order is completed and cannot be modified")
)

type SupplierOrderService struct {
	repo            *repository.SupplierOrderRepository
	orderStatusRepo *repository.OrderStatusRepository
	itemRepo        *repository.SupplierOrderItemRepository
	stockRepo       *repository.StockRepository
}

func NewSupplierOrderService(
	repo *repository.SupplierOrderRepository,
	orderStatusRepo *repository.OrderStatusRepository,
	itemRepo *repository.SupplierOrderItemRepository,
	stockRepo *repository.StockRepository,
) *SupplierOrderService {
	return &SupplierOrderService{
		repo:            repo,
		orderStatusRepo: orderStatusRepo,
		itemRepo:        itemRepo,
		stockRepo:       stockRepo,
	}
}

func (s *SupplierOrderService) GetByID(ctx context.Context, orderID uuid.UUID) (*dto.SupplierOrderResponse, error) {
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to get supplier order by ID")
		return nil, err
	}

	var statusIDStr *string
	if order.StatusID != nil {
		str := order.StatusID.String()
		statusIDStr = &str
	}
	var parentOrderIDStr *string
	if order.ParentOrderID != nil {
		str := order.ParentOrderID.String()
		parentOrderIDStr = &str
	}
	var createdByStr *string
	if order.CreatedBy != nil {
		str := order.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if order.UpdatedBy != nil {
		str := order.UpdatedBy.String()
		updatedByStr = &str
	}

	return &dto.SupplierOrderResponse{
		// Numbering
		OrderNumber:         order.OrderNumber,
		OrderID:             order.OrderID.String(),
		Buyer:               order.Buyer,
		StatusID:            statusIDStr,
		PurchaseDate:        order.PurchaseDate,
		PlannedReceiptDate:  order.PlannedReceiptDate,
		ActualReceiptDate:   order.ActualReceiptDate,
		LogisticsChinaMsk:   order.LogisticsChinaMsk,
		LogisticsMskKzn:     order.LogisticsMskKzn,
		LogisticsAdditional: order.LogisticsAdditional,
		LogisticsTotal:      order.LogisticsTotal,
		OrderItemCost:       order.OrderItemCost,
		PositionsQty:        order.PositionsQty,
		TotalQty:            order.TotalQty,
		OrderItemWeight:     order.OrderItemWeight,
		ParentOrderID:       parentOrderIDStr,
		CreatedBy:           createdByStr,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) List(ctx context.Context, limit, offset int, statusID *uuid.UUID) ([]dto.SupplierOrderResponse, error) {
	orders, err := s.repo.List(ctx, limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Interface("statusId", statusID).Msg("Failed to list supplier orders")
		return nil, err
	}

	result := make([]dto.SupplierOrderResponse, 0, len(orders))
	for _, order := range orders {
		var statusIDStr *string
		if order.StatusID != nil {
			str := order.StatusID.String()
			statusIDStr = &str
		}
		var parentOrderIDStr *string
		if order.ParentOrderID != nil {
			str := order.ParentOrderID.String()
			parentOrderIDStr = &str
		}
		var createdByStr *string
		if order.CreatedBy != nil {
			str := order.CreatedBy.String()
			createdByStr = &str
		}
		var updatedByStr *string
		if order.UpdatedBy != nil {
			str := order.UpdatedBy.String()
			updatedByStr = &str
		}

		result = append(result, dto.SupplierOrderResponse{
			OrderID:             order.OrderID.String(),
			OrderNumber:         order.OrderNumber,
			Buyer:               order.Buyer,
			StatusID:            statusIDStr,
			PurchaseDate:        order.PurchaseDate,
			PlannedReceiptDate:  order.PlannedReceiptDate,
			ActualReceiptDate:   order.ActualReceiptDate,
			LogisticsChinaMsk:   order.LogisticsChinaMsk,
			LogisticsMskKzn:     order.LogisticsMskKzn,
			LogisticsAdditional: order.LogisticsAdditional,
			LogisticsTotal:      order.LogisticsTotal,
			OrderItemCost:       order.OrderItemCost,
			PositionsQty:        order.PositionsQty,
			TotalQty:            order.TotalQty,
			OrderItemWeight:     order.OrderItemWeight,
			ParentOrderID:       parentOrderIDStr,
			CreatedBy:           createdByStr,
			CreatedAt:           order.CreatedAt,
			UpdatedBy:           updatedByStr,
			UpdatedAt:           order.UpdatedAt,
		})
	}

	return result, nil
}

func (s *SupplierOrderService) Create(ctx context.Context, userID uuid.UUID, req dto.SupplierOrderCreateRequest) (*dto.SupplierOrderResponse, error) {
	var statusID *uuid.UUID
	if req.StatusID != nil && *req.StatusID != "" {
		id, err := uuid.Parse(*req.StatusID)
		if err != nil {
			log.Warn().Str("statusId", *req.StatusID).Msg("Invalid status ID format")
			return nil, repository.ErrOrderStatusNotFound
		}
		statusID = &id

		_, err = s.orderStatusRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrOrderStatusNotFound {
				log.Warn().Str("statusId", *req.StatusID).Msg("Order status not found")
				return nil, repository.ErrOrderStatusNotFound
			}
			log.Error().Err(err).Str("statusId", *req.StatusID).Msg("Failed to validate order status")
			return nil, err
		}
	}

	var parentOrderID *uuid.UUID
	if req.ParentOrderID != nil && *req.ParentOrderID != "" {
		id, err := uuid.Parse(*req.ParentOrderID)
		if err != nil {
			log.Warn().Str("parentOrderId", *req.ParentOrderID).Msg("Invalid parent order ID format")
			return nil, repository.ErrSupplierOrderNotFound
		}
		parentOrderID = &id

		_, err = s.repo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrSupplierOrderNotFound {
				log.Warn().Str("parentOrderId", *req.ParentOrderID).Msg("Parent order not found")
				return nil, repository.ErrSupplierOrderNotFound
			}
			log.Error().Err(err).Str("parentOrderId", *req.ParentOrderID).Msg("Failed to validate parent order")
			return nil, err
		}
	}

	if req.PlannedReceiptDate != nil && req.PurchaseDate != nil {
		if req.PlannedReceiptDate.Before(*req.PurchaseDate) {
			log.Warn().Time("purchaseDate", *req.PurchaseDate).Time("plannedReceiptDate", *req.PlannedReceiptDate).Msg("Planned receipt date must be after purchase date")
			return nil, repository.ErrInvalidDateRange
		}
	}

	if req.ActualReceiptDate != nil && req.PlannedReceiptDate != nil {
		if req.ActualReceiptDate.Before(*req.PlannedReceiptDate) {
			log.Warn().Time("plannedReceiptDate", *req.PlannedReceiptDate).Time("actualReceiptDate", *req.ActualReceiptDate).Msg("Actual receipt date must be after planned receipt date")
			return nil, repository.ErrInvalidDateRange
		}
	}

	// --- numbering ---
	// For now, order numbers are generated automatically on the backend.
	// Parent orders: N, sub-orders: N.1, N.2, ...
	var mainNumber int
	var subNumber *int
	var orderNumber string

	if parentOrderID != nil {
		// Sub-order: get parent's main number and next sub-number for that main.
		parentOrder, err := s.repo.GetByID(ctx, *parentOrderID)
		if err != nil {
			if err == repository.ErrSupplierOrderNotFound {
				log.Warn().Str("parentOrderId", (*parentOrderID).String()).Msg("Parent order not found when generating sub-order number")
				return nil, repository.ErrSupplierOrderNotFound
			}
			log.Error().Err(err).Str("parentOrderId", (*parentOrderID).String()).Msg("Failed to load parent order for numbering")
			return nil, err
		}

		mainNumber = parentOrder.MainNumber
		nextSub, err := s.repo.GetNextSubNumber(ctx, mainNumber)
		if err != nil {
			log.Error().Err(err).Int("mainNumber", mainNumber).Msg("Failed to determine next sub-number for supplier order")
			return nil, err
		}
		subNumber = &nextSub
		orderNumber = fmt.Sprintf("%d.%d", mainNumber, nextSub)
	} else {
		// Main order: get next main number across all orders.
		nextMain, err := s.repo.GetNextMainNumber(ctx)
		if err != nil {
			log.Error().Err(err).Msg("Failed to determine next main number for supplier order")
			return nil, err
		}
		mainNumber = nextMain
		subNumber = nil
		orderNumber = fmt.Sprintf("%d", mainNumber)
	}

	order, err := s.repo.Create(ctx,
		orderNumber,
		mainNumber,
		subNumber,
		req.Buyer,
		statusID,
		req.PurchaseDate,
		req.PlannedReceiptDate,
		req.ActualReceiptDate,
		req.LogisticsChinaMsk,
		req.LogisticsMskKzn,
		req.LogisticsAdditional,
		req.LogisticsTotal,
		req.OrderItemCost,
		req.OrderItemWeight,
		req.PositionsQty,
		req.TotalQty,
		parentOrderID,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("orderNumber", req.OrderNumber).Str("userId", userID.String()).Msg("Failed to create supplier order")
		return nil, err
	}

	var statusIDStr *string
	if order.StatusID != nil {
		str := order.StatusID.String()
		statusIDStr = &str
	}
	var parentOrderIDStr *string
	if order.ParentOrderID != nil {
		str := order.ParentOrderID.String()
		parentOrderIDStr = &str
	}
	var createdByStr *string
	if order.CreatedBy != nil {
		str := order.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if order.UpdatedBy != nil {
		str := order.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("orderId", order.OrderID.String()).Str("orderNumber", order.OrderNumber).Str("userId", userID.String()).Msg("Supplier order created successfully")
	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID.String(),
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            statusIDStr,
		PurchaseDate:        order.PurchaseDate,
		PlannedReceiptDate:  order.PlannedReceiptDate,
		ActualReceiptDate:   order.ActualReceiptDate,
		LogisticsChinaMsk:   order.LogisticsChinaMsk,
		LogisticsMskKzn:     order.LogisticsMskKzn,
		LogisticsAdditional: order.LogisticsAdditional,
		LogisticsTotal:      order.LogisticsTotal,
		OrderItemCost:       order.OrderItemCost,
		PositionsQty:        order.PositionsQty,
		TotalQty:            order.TotalQty,
		OrderItemWeight:     order.OrderItemWeight,
		ParentOrderID:       parentOrderIDStr,
		CreatedBy:           createdByStr,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

// CreateSubOrder creates a sub-order for an existing parent order. Most fields
// default to the parent order values when not explicitly provided, while
// numbering (main/sub) is generated automatically based on the parent.
func (s *SupplierOrderService) CreateSubOrder(ctx context.Context, userID, parentOrderID uuid.UUID, req dto.SupplierSubOrderCreateRequest) (*dto.SupplierOrderResponse, error) {
	// Load parent order to inherit default values and mainNumber.
	parentOrder, err := s.repo.GetByID(ctx, parentOrderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("parentOrderId", parentOrderID.String()).Msg("Parent order not found for sub-order creation")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("parentOrderId", parentOrderID.String()).Msg("Failed to load parent order for sub-order creation")
		return nil, err
	}

	// --- status ---
	var statusID *uuid.UUID
	if req.StatusID != nil && *req.StatusID != "" {
		id, err := uuid.Parse(*req.StatusID)
		if err != nil {
			log.Warn().Str("statusId", *req.StatusID).Msg("Invalid status ID format for sub-order")
			return nil, repository.ErrOrderStatusNotFound
		}
		statusID = &id

		_, err = s.orderStatusRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrOrderStatusNotFound {
				log.Warn().Str("statusId", *req.StatusID).Msg("Order status not found for sub-order")
				return nil, repository.ErrOrderStatusNotFound
			}
			log.Error().Err(err).Str("statusId", *req.StatusID).Msg("Failed to validate order status for sub-order")
			return nil, err
		}
	} else {
		statusID = parentOrder.StatusID
	}

	// --- inherit / override base fields from parent ---
	buyer := parentOrder.Buyer
	if req.Buyer != nil {
		buyer = req.Buyer
	}

	purchaseDate := parentOrder.PurchaseDate
	if req.PurchaseDate != nil {
		purchaseDate = req.PurchaseDate
	}

	plannedReceiptDate := parentOrder.PlannedReceiptDate
	if req.PlannedReceiptDate != nil {
		plannedReceiptDate = req.PlannedReceiptDate
	}

	actualReceiptDate := parentOrder.ActualReceiptDate
	if req.ActualReceiptDate != nil {
		actualReceiptDate = req.ActualReceiptDate
	}

	// --- logistics: sub-order has its own logistics, not inherited from parent ---
	// If values are not provided, they start as nil/zero and can be entered later
	// when editing the sub-order.
	logisticsChinaMsk := req.LogisticsChinaMsk
	logisticsMskKzn := req.LogisticsMskKzn
	logisticsAdditional := req.LogisticsAdditional
	logisticsTotal := req.LogisticsTotal

	// --- validate dates ---
	if plannedReceiptDate != nil && purchaseDate != nil {
		if plannedReceiptDate.Before(*purchaseDate) {
			log.Warn().
				Time("purchaseDate", *purchaseDate).
				Time("plannedReceiptDate", *plannedReceiptDate).
				Msg("Planned receipt date must be after purchase date (sub-order)")
			return nil, repository.ErrInvalidDateRange
		}
	}

	if actualReceiptDate != nil && plannedReceiptDate != nil {
		if actualReceiptDate.Before(*plannedReceiptDate) {
			log.Warn().
				Time("plannedReceiptDate", *plannedReceiptDate).
				Time("actualReceiptDate", *actualReceiptDate).
				Msg("Actual receipt date must be after planned receipt date (sub-order)")
			return nil, repository.ErrInvalidDateRange
		}
	}

	// --- numbering for sub-order ---
	mainNumber := parentOrder.MainNumber
	nextSub, err := s.repo.GetNextSubNumber(ctx, mainNumber)
	if err != nil {
		log.Error().Err(err).Int("mainNumber", mainNumber).Msg("Failed to determine next sub-number for supplier sub-order")
		return nil, err
	}
	subNumber := &nextSub
	orderNumber := fmt.Sprintf("%d.%d", mainNumber, nextSub)

	// Sub-order starts with zero aggregates; they will be recalculated after items are moved.
	// Parent-child relationship:
	//   - Root order: ParentOrderID == nil
	//   - Any sub-order (1.1, 1.2, 1.3, ...) should have ParentOrderID pointing to the root.
	//     Even if the user creates a sub-order from an existing sub-order, we keep the
	//     hierarchy flat under the root order instead of nesting multiple levels.
	parentIDCopy := parentOrderID
	if parentOrder.ParentOrderID != nil {
		parentIDCopy = *parentOrder.ParentOrderID
	}
	order, err := s.repo.Create(ctx,
		orderNumber,
		mainNumber,
		subNumber,
		buyer,
		statusID,
		purchaseDate,
		plannedReceiptDate,
		actualReceiptDate,
		logisticsChinaMsk,
		logisticsMskKzn,
		logisticsAdditional,
		logisticsTotal,
		nil, // OrderItemCost
		nil, // OrderItemWeight
		0,   // PositionsQty
		0,   // TotalQty
		&parentIDCopy,
		&userID,
	)
	if err != nil {
		log.Error().
			Err(err).
			Str("orderNumber", orderNumber).
			Str("userId", userID.String()).
			Str("parentOrderId", parentOrderID.String()).
			Msg("Failed to create supplier sub-order")
		return nil, err
	}

	var statusIDStr *string
	if order.StatusID != nil {
		str := order.StatusID.String()
		statusIDStr = &str
	}
	var parentOrderIDStr *string
	if order.ParentOrderID != nil {
		str := order.ParentOrderID.String()
		parentOrderIDStr = &str
	}
	var createdByStr *string
	if order.CreatedBy != nil {
		str := order.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if order.UpdatedBy != nil {
		str := order.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().
		Str("orderId", order.OrderID.String()).
		Str("orderNumber", order.OrderNumber).
		Str("parentOrderId", parentOrderID.String()).
		Str("userId", userID.String()).
		Msg("Supplier sub-order created successfully")

	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID.String(),
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            statusIDStr,
		PurchaseDate:        order.PurchaseDate,
		PlannedReceiptDate:  order.PlannedReceiptDate,
		ActualReceiptDate:   order.ActualReceiptDate,
		LogisticsChinaMsk:   order.LogisticsChinaMsk,
		LogisticsMskKzn:     order.LogisticsMskKzn,
		LogisticsAdditional: order.LogisticsAdditional,
		LogisticsTotal:      order.LogisticsTotal,
		OrderItemCost:       order.OrderItemCost,
		PositionsQty:        order.PositionsQty,
		TotalQty:            order.TotalQty,
		OrderItemWeight:     order.OrderItemWeight,
		ParentOrderID:       parentOrderIDStr,
		CreatedBy:           createdByStr,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) Update(ctx context.Context, orderID, userID uuid.UUID, req dto.SupplierOrderUpdateRequest) (*dto.SupplierOrderResponse, error) {
	var statusID *uuid.UUID
	var newStatus *repository.OrderStatus
	if req.StatusID != nil && *req.StatusID != "" {
		id, err := uuid.Parse(*req.StatusID)
		if err != nil {
			log.Warn().Str("statusId", *req.StatusID).Msg("Invalid status ID format")
			return nil, repository.ErrOrderStatusNotFound
		}
		statusID = &id

		status, err := s.orderStatusRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrOrderStatusNotFound {
				log.Warn().Str("statusId", *req.StatusID).Msg("Order status not found")
				return nil, repository.ErrOrderStatusNotFound
			}
			log.Error().Err(err).Str("statusId", *req.StatusID).Msg("Failed to validate order status")
			return nil, err
		}
		newStatus = status
	}

	var parentOrderID *uuid.UUID
	if req.ParentOrderID != nil && *req.ParentOrderID != "" {
		id, err := uuid.Parse(*req.ParentOrderID)
		if err != nil {
			log.Warn().Str("parentOrderId", *req.ParentOrderID).Msg("Invalid parent order ID format")
			return nil, repository.ErrSupplierOrderNotFound
		}
		parentOrderID = &id

		if id == orderID {
			log.Warn().Str("orderId", orderID.String()).Str("parentOrderId", *req.ParentOrderID).Msg("Order cannot be parent of itself")
			return nil, repository.ErrInvalidParentOrder
		}

		_, err = s.repo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrSupplierOrderNotFound {
				log.Warn().Str("parentOrderId", *req.ParentOrderID).Msg("Parent order not found")
				return nil, repository.ErrSupplierOrderNotFound
			}
			log.Error().Err(err).Str("parentOrderId", *req.ParentOrderID).Msg("Failed to validate parent order")
			return nil, err
		}
	}

	if req.PlannedReceiptDate != nil && req.PurchaseDate != nil {
		if req.PlannedReceiptDate.Before(*req.PurchaseDate) {
			log.Warn().Time("purchaseDate", *req.PurchaseDate).Time("plannedReceiptDate", *req.PlannedReceiptDate).Msg("Planned receipt date must be after purchase date")
			return nil, repository.ErrInvalidDateRange
		}
	}

	if req.ActualReceiptDate != nil && req.PlannedReceiptDate != nil {
		if req.ActualReceiptDate.Before(*req.PlannedReceiptDate) {
			log.Warn().Time("plannedReceiptDate", *req.PlannedReceiptDate).Time("actualReceiptDate", *req.ActualReceiptDate).Msg("Actual receipt date must be after planned receipt date")
			return nil, repository.ErrInvalidDateRange
		}
	}

	// Preserve existing numbering for now: order numbers are immutable via this endpoint.
	existingOrder, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", orderID.String()).Msg("Supplier order not found during update (while loading existing order)")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load existing supplier order for update")
		return nil, err
	}

	// If parentOrderID was not provided in the request, keep the existing parent relationship.
	// This is critical for sub-orders: the "complete order" action should not detach a sub-order
	// from its parent just because parentOrderId was not explicitly sent from the client.
	if parentOrderID == nil && existingOrder.ParentOrderID != nil {
		parentOrderID = existingOrder.ParentOrderID
	}

	// Prevent modifications to orders that are already completed (final status).
	isCurrentlyFinal := s.isOrderFinal(ctx, orderID)
	if isCurrentlyFinal {
		log.Warn().Str("orderId", orderID.String()).Msg("Attempt to update completed supplier order")
		return nil, ErrSupplierOrderCompleted
	}

	// Aggregated fields (positions_qty, total_qty, order_item_weight, order_item_cost)
	// are derived from order items and must NOT be overridden from the request.
	// We always preserve the existing values here; they are updated exclusively
	// via SupplierOrderItemService.recalcAndUpdateOrderAggregates.
	// If the new status is final and the order did not have a final status before,
	// ensure that ActualReceiptDate is populated so that stock snapshots have a
	// meaningful receipt date.
	becomesFinal := newStatus != nil && newStatus.IsFinal && !isCurrentlyFinal
	if becomesFinal && req.ActualReceiptDate == nil && existingOrder.ActualReceiptDate == nil {
		now := time.Now().UTC()
		req.ActualReceiptDate = &now
	}

	order, err := s.repo.Update(ctx, orderID,
		existingOrder.OrderNumber,
		req.Buyer,
		statusID,
		req.PurchaseDate,
		req.PlannedReceiptDate,
		req.ActualReceiptDate,
		req.LogisticsChinaMsk,
		req.LogisticsMskKzn,
		req.LogisticsAdditional,
		req.LogisticsTotal,
		existingOrder.OrderItemCost,
		existingOrder.OrderItemWeight,
		existingOrder.PositionsQty,
		existingOrder.TotalQty,
		parentOrderID,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Str("userId", userID.String()).Msg("Failed to update supplier order")
		return nil, err
	}

	// If the order has just transitioned to a final status, apply all received
	// quantities to stock snapshots in a single, idempotent operation.
	if becomesFinal {
		if applyErr := s.applyReceivedToStock(ctx, order, userID); applyErr != nil {
			log.Error().Err(applyErr).Str("orderId", orderID.String()).Msg("Failed to apply received quantities to stock for completed supplier order")
			return nil, applyErr
		}
	}

	var statusIDStr *string
	if order.StatusID != nil {
		str := order.StatusID.String()
		statusIDStr = &str
	}
	var parentOrderIDStr *string
	if order.ParentOrderID != nil {
		str := order.ParentOrderID.String()
		parentOrderIDStr = &str
	}
	var createdByStr *string
	if order.CreatedBy != nil {
		str := order.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if order.UpdatedBy != nil {
		str := order.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("orderId", orderID.String()).Str("userId", userID.String()).Msg("Supplier order updated successfully")
	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID.String(),
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            statusIDStr,
		PurchaseDate:        order.PurchaseDate,
		PlannedReceiptDate:  order.PlannedReceiptDate,
		ActualReceiptDate:   order.ActualReceiptDate,
		LogisticsChinaMsk:   order.LogisticsChinaMsk,
		LogisticsMskKzn:     order.LogisticsMskKzn,
		LogisticsAdditional: order.LogisticsAdditional,
		LogisticsTotal:      order.LogisticsTotal,
		OrderItemCost:       order.OrderItemCost,
		PositionsQty:        order.PositionsQty,
		TotalQty:            order.TotalQty,
		OrderItemWeight:     order.OrderItemWeight,
		ParentOrderID:       parentOrderIDStr,
		CreatedBy:           createdByStr,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) Delete(ctx context.Context, orderID uuid.UUID) error {
	// Prevent deletion of completed orders
	if s.isOrderFinal(ctx, orderID) {
		log.Warn().Str("orderId", orderID.String()).Msg("Attempt to delete completed supplier order")
		return ErrSupplierOrderCompleted
	}

	_, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			return err
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load supplier order before delete")
		return err
	}

	// Check if order has sub-orders before attempting deletion
	hasSubOrders, checkErr := s.repo.HasSubOrders(ctx, orderID)
	if checkErr != nil {
		log.Error().Err(checkErr).Str("orderId", orderID.String()).Msg("Failed to check for sub-orders before deletion")
		return checkErr
	}
	if hasSubOrders {
		log.Warn().Str("orderId", orderID.String()).Msg("Attempt to delete supplier order with sub-orders")
		return repository.ErrSupplierOrderHasSubOrders
	}

	err = s.repo.Delete(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderHasSubOrders {
			return err
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to delete supplier order")
		return err
	}

	log.Info().Str("orderId", orderID.String()).Msg("Supplier order deleted successfully")
	return nil
}

// isOrderFinal checks if the given order has a final (completed) status.
// Returns false if the order has no status or if status lookup fails.
func (s *SupplierOrderService) isOrderFinal(ctx context.Context, orderID uuid.UUID) bool {
	order, err := s.repo.GetByID(ctx, orderID)
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

// applyReceivedToStock applies all received quantities from the given supplier order
// to stock snapshots, grouped by product and warehouse.
// This operation is idempotent: multiple calls with the same order will add quantities
// multiple times (which is acceptable for stock snapshots as they represent cumulative state).
// Only items with receivedQty > 0 are processed.
func (s *SupplierOrderService) applyReceivedToStock(ctx context.Context, order *repository.SupplierOrder, userID uuid.UUID) error {
	items, err := s.itemRepo.GetByOrderID(ctx, order.OrderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", order.OrderID.String()).Msg("Failed to load order items for stock application")
		return err
	}
	if len(items) == 0 {
		log.Info().Str("orderId", order.OrderID.String()).Msg("No items to apply to stock for completed supplier order")
		return nil
	}

	receiptDate := order.ActualReceiptDate
	if receiptDate == nil {
		if order.PurchaseDate != nil {
			receiptDate = order.PurchaseDate
		} else {
			now := time.Now().UTC()
			receiptDate = &now
		}
	}

	itemsApplied := 0
	for _, item := range items {
		if item.ReceivedQty <= 0 {
			continue
		}

		if err := s.stockRepo.ApplyReceiptFromSupplierOrder(
			ctx,
			item.ProductID,
			item.WarehouseID,
			*receiptDate,
			item.ReceivedQty,
			&userID,
		); err != nil {
			log.Error().
				Err(err).
				Str("orderId", order.OrderID.String()).
				Str("productId", item.ProductID.String()).
				Str("warehouseId", item.WarehouseID.String()).
				Int("receivedQty", item.ReceivedQty).
				Time("receiptDate", *receiptDate).
				Msg("Failed to apply receipt from supplier order item to stock")
			return err
		}
		itemsApplied++
	}

	if itemsApplied > 0 {
		log.Info().
			Str("orderId", order.OrderID.String()).
			Int("itemsApplied", itemsApplied).
			Time("receiptDate", *receiptDate).
			Msg("Successfully applied received quantities to stock for completed supplier order")
	} else {
		log.Info().
			Str("orderId", order.OrderID.String()).
			Msg("No items with received quantities to apply to stock for completed supplier order")
	}

	return nil
}
