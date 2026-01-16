package service

import (
	"context"

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

func (s *SupplierOrderService) GetByID(ctx context.Context, orderID int) (*dto.SupplierOrderResponse, error) {
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to get supplier order by ID")
		return nil, err
	}

	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID,
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            order.StatusID,
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
		ParentOrderID:       order.ParentOrderID,
		CreatedBy:           order.CreatedBy,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           order.UpdatedBy,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) List(ctx context.Context, limit, offset int, statusID *int) ([]dto.SupplierOrderResponse, error) {
	orders, err := s.repo.List(ctx, limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Interface("statusId", statusID).Msg("Failed to list supplier orders")
		return nil, err
	}

	result := make([]dto.SupplierOrderResponse, 0, len(orders))
	for _, order := range orders {
		result = append(result, dto.SupplierOrderResponse{
			OrderID:             order.OrderID,
			OrderNumber:         order.OrderNumber,
			Buyer:               order.Buyer,
			StatusID:            order.StatusID,
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
			ParentOrderID:       order.ParentOrderID,
			CreatedBy:           order.CreatedBy,
			CreatedAt:           order.CreatedAt,
			UpdatedBy:           order.UpdatedBy,
			UpdatedAt:           order.UpdatedAt,
		})
	}

	return result, nil
}

func (s *SupplierOrderService) Create(ctx context.Context, userID int, req dto.SupplierOrderCreateRequest) (*dto.SupplierOrderResponse, error) {
	if req.StatusID != nil {
		_, err := s.orderStatusRepo.GetByID(ctx, *req.StatusID)
		if err != nil {
			if err == repository.ErrOrderStatusNotFound {
				log.Warn().Int("statusId", *req.StatusID).Msg("Order status not found")
				return nil, repository.ErrOrderStatusNotFound
			}
			log.Error().Err(err).Int("statusId", *req.StatusID).Msg("Failed to validate order status")
			return nil, err
		}
	}

	if req.ParentOrderID != nil {
		_, err := s.repo.GetByID(ctx, *req.ParentOrderID)
		if err != nil {
			if err == repository.ErrSupplierOrderNotFound {
				log.Warn().Int("parentOrderId", *req.ParentOrderID).Msg("Parent order not found")
				return nil, repository.ErrSupplierOrderNotFound
			}
			log.Error().Err(err).Int("parentOrderId", *req.ParentOrderID).Msg("Failed to validate parent order")
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

	order, err := s.repo.Create(ctx,
		req.OrderNumber,
		req.Buyer,
		req.StatusID,
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
		req.ParentOrderID,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("orderNumber", req.OrderNumber).Int("userId", userID).Msg("Failed to create supplier order")
		return nil, err
	}

	log.Info().Int("orderId", order.OrderID).Str("orderNumber", order.OrderNumber).Int("userId", userID).Msg("Supplier order created successfully")
	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID,
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            order.StatusID,
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
		ParentOrderID:       order.ParentOrderID,
		CreatedBy:           order.CreatedBy,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           order.UpdatedBy,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) Update(ctx context.Context, orderID, userID int, req dto.SupplierOrderUpdateRequest) (*dto.SupplierOrderResponse, error) {
	if req.StatusID != nil {
		_, err := s.orderStatusRepo.GetByID(ctx, *req.StatusID)
		if err != nil {
			if err == repository.ErrOrderStatusNotFound {
				log.Warn().Int("statusId", *req.StatusID).Msg("Order status not found")
				return nil, repository.ErrOrderStatusNotFound
			}
			log.Error().Err(err).Int("statusId", *req.StatusID).Msg("Failed to validate order status")
			return nil, err
		}
	}

	if req.ParentOrderID != nil {
		if *req.ParentOrderID == orderID {
			log.Warn().Int("orderId", orderID).Int("parentOrderId", *req.ParentOrderID).Msg("Order cannot be parent of itself")
			return nil, repository.ErrInvalidParentOrder
		}
		_, err := s.repo.GetByID(ctx, *req.ParentOrderID)
		if err != nil {
			if err == repository.ErrSupplierOrderNotFound {
				log.Warn().Int("parentOrderId", *req.ParentOrderID).Msg("Parent order not found")
				return nil, repository.ErrSupplierOrderNotFound
			}
			log.Error().Err(err).Int("parentOrderId", *req.ParentOrderID).Msg("Failed to validate parent order")
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

	order, err := s.repo.Update(ctx, orderID,
		req.OrderNumber,
		req.Buyer,
		req.StatusID,
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
		req.ParentOrderID,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Int("userId", userID).Msg("Failed to update supplier order")
		return nil, err
	}

	log.Info().Int("orderId", orderID).Int("userId", userID).Msg("Supplier order updated successfully")
	return &dto.SupplierOrderResponse{
		OrderID:             order.OrderID,
		OrderNumber:         order.OrderNumber,
		Buyer:               order.Buyer,
		StatusID:            order.StatusID,
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
		ParentOrderID:       order.ParentOrderID,
		CreatedBy:           order.CreatedBy,
		CreatedAt:           order.CreatedAt,
		UpdatedBy:           order.UpdatedBy,
		UpdatedAt:           order.UpdatedAt,
	}, nil
}

func (s *SupplierOrderService) Delete(ctx context.Context, orderID int) error {
	err := s.repo.Delete(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to delete supplier order")
		return err
	}

	log.Info().Int("orderId", orderID).Msg("Supplier order deleted successfully")
	return nil
}
