package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type SupplierOrderService struct {
	repo *repository.SupplierOrderRepository
}

func NewSupplierOrderService(repo *repository.SupplierOrderRepository) *SupplierOrderService {
	return &SupplierOrderService{repo: repo}
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
