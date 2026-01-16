package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type MpShipmentItemService struct {
	repo          *repository.MpShipmentItemRepository
	shipmentRepo  *repository.MpShipmentRepository
	productRepo   *repository.ProductRepository
	warehouseRepo *repository.WarehouseRepository
}

func NewMpShipmentItemService(repo *repository.MpShipmentItemRepository, shipmentRepo *repository.MpShipmentRepository, productRepo *repository.ProductRepository, warehouseRepo *repository.WarehouseRepository) *MpShipmentItemService {
	return &MpShipmentItemService{
		repo:          repo,
		shipmentRepo:  shipmentRepo,
		productRepo:   productRepo,
		warehouseRepo: warehouseRepo,
	}
}

func (s *MpShipmentItemService) GetByID(ctx context.Context, itemID int) (*dto.MpShipmentItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to get mp shipment item by ID")
		return nil, err
	}

	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID,
		ShipmentID:       item.ShipmentID,
		ProductID:        item.ProductID,
		WarehouseID:      item.WarehouseID,
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) GetByShipmentID(ctx context.Context, shipmentID int) ([]dto.MpShipmentItemResponse, error) {
	items, err := s.repo.GetByShipmentID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to get mp shipment items by shipment ID")
		return nil, err
	}

	result := make([]dto.MpShipmentItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.MpShipmentItemResponse{
			ShipmentItemID:   item.ShipmentItemID,
			ShipmentID:       item.ShipmentID,
			ProductID:        item.ProductID,
			WarehouseID:      item.WarehouseID,
			SentQty:          item.SentQty,
			AcceptedQty:      item.AcceptedQty,
			LogisticsForItem: item.LogisticsForItem,
		})
	}

	return result, nil
}

func (s *MpShipmentItemService) Create(ctx context.Context, req dto.MpShipmentItemCreateRequest) (*dto.MpShipmentItemResponse, error) {
	_, err := s.shipmentRepo.GetByID(ctx, req.ShipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Int("shipmentId", req.ShipmentID).Msg("Mp shipment not found")
			return nil, repository.ErrMpShipmentNotFound
		}
		log.Error().Err(err).Int("shipmentId", req.ShipmentID).Msg("Failed to validate mp shipment")
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx,
		req.ShipmentID,
		req.ProductID,
		req.WarehouseID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", req.ShipmentID).Int("productId", req.ProductID).Msg("Failed to create mp shipment item")
		return nil, err
	}

	log.Info().Int("shipmentItemId", item.ShipmentItemID).Int("shipmentId", req.ShipmentID).Int("productId", req.ProductID).Msg("Mp shipment item created successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID,
		ShipmentID:       item.ShipmentID,
		ProductID:        item.ProductID,
		WarehouseID:      item.WarehouseID,
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) Update(ctx context.Context, itemID int, req dto.MpShipmentItemUpdateRequest) (*dto.MpShipmentItemResponse, error) {
	_, err := s.shipmentRepo.GetByID(ctx, req.ShipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Int("shipmentId", req.ShipmentID).Msg("Mp shipment not found")
			return nil, repository.ErrMpShipmentNotFound
		}
		log.Error().Err(err).Int("shipmentId", req.ShipmentID).Msg("Failed to validate mp shipment")
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID,
		req.ShipmentID,
		req.ProductID,
		req.WarehouseID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to update mp shipment item")
		return nil, err
	}

	log.Info().Int("itemId", itemID).Msg("Mp shipment item updated successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID,
		ShipmentID:       item.ShipmentID,
		ProductID:        item.ProductID,
		WarehouseID:      item.WarehouseID,
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) Delete(ctx context.Context, itemID int) error {
	err := s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete mp shipment item")
		return err
	}

	log.Info().Int("itemId", itemID).Msg("Mp shipment item deleted successfully")
	return nil
}
