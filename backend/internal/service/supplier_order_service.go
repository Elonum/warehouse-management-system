package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type SupplierOrderService struct {
	repo            *repository.SupplierOrderRepository
	orderStatusRepo *repository.OrderStatusRepository
}

func NewSupplierOrderService(repo *repository.SupplierOrderRepository, orderStatusRepo *repository.OrderStatusRepository) *SupplierOrderService {
	return &SupplierOrderService{
		repo:            repo,
		orderStatusRepo: orderStatusRepo,
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

func (s *SupplierOrderService) Update(ctx context.Context, orderID, userID uuid.UUID, req dto.SupplierOrderUpdateRequest) (*dto.SupplierOrderResponse, error) {
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
		req.OrderItemCost,
		req.OrderItemWeight,
		req.PositionsQty,
		req.TotalQty,
		parentOrderID,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Str("userId", userID.String()).Msg("Failed to update supplier order")
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
	err := s.repo.Delete(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to delete supplier order")
		return err
	}

	log.Info().Str("orderId", orderID.String()).Msg("Supplier order deleted successfully")
	return nil
}
