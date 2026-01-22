package service

import (
	"context"

	"github.com/google/uuid"
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

func (s *MpShipmentItemService) GetByID(ctx context.Context, itemID uuid.UUID) (*dto.MpShipmentItemResponse, error) {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to get mp shipment item by ID")
		return nil, err
	}

	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID.String(),
		ShipmentID:       item.ShipmentID.String(),
		ProductID:        item.ProductID.String(),
		WarehouseID:      item.WarehouseID.String(),
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) GetByShipmentID(ctx context.Context, shipmentID uuid.UUID) ([]dto.MpShipmentItemResponse, error) {
	items, err := s.repo.GetByShipmentID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to get mp shipment items by shipment ID")
		return nil, err
	}

	result := make([]dto.MpShipmentItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.MpShipmentItemResponse{
			ShipmentItemID:   item.ShipmentItemID.String(),
			ShipmentID:       item.ShipmentID.String(),
			ProductID:        item.ProductID.String(),
			WarehouseID:      item.WarehouseID.String(),
			SentQty:          item.SentQty,
			AcceptedQty:      item.AcceptedQty,
			LogisticsForItem: item.LogisticsForItem,
		})
	}

	return result, nil
}

func (s *MpShipmentItemService) Create(ctx context.Context, req dto.MpShipmentItemCreateRequest) (*dto.MpShipmentItemResponse, error) {
	shipmentID, err := uuid.Parse(req.ShipmentID)
	if err != nil {
		log.Warn().Str("shipmentId", req.ShipmentID).Msg("Invalid shipment ID format")
		return nil, repository.ErrMpShipmentNotFound
	}
	_, err = s.shipmentRepo.GetByID(ctx, shipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Str("shipmentId", req.ShipmentID).Msg("Mp shipment not found")
			return nil, repository.ErrMpShipmentNotFound
		}
		log.Error().Err(err).Str("shipmentId", req.ShipmentID).Msg("Failed to validate mp shipment")
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx,
		shipmentID,
		productID,
		warehouseID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", req.ShipmentID).Str("productId", req.ProductID).Msg("Failed to create mp shipment item")
		return nil, err
	}

	log.Info().Str("shipmentItemId", item.ShipmentItemID.String()).Str("shipmentId", req.ShipmentID).Str("productId", req.ProductID).Msg("Mp shipment item created successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID.String(),
		ShipmentID:       item.ShipmentID.String(),
		ProductID:        item.ProductID.String(),
		WarehouseID:      item.WarehouseID.String(),
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) Update(ctx context.Context, itemID uuid.UUID, req dto.MpShipmentItemUpdateRequest) (*dto.MpShipmentItemResponse, error) {
	shipmentID, err := uuid.Parse(req.ShipmentID)
	if err != nil {
		log.Warn().Str("shipmentId", req.ShipmentID).Msg("Invalid shipment ID format")
		return nil, repository.ErrMpShipmentNotFound
	}
	_, err = s.shipmentRepo.GetByID(ctx, shipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Str("shipmentId", req.ShipmentID).Msg("Mp shipment not found")
			return nil, repository.ErrMpShipmentNotFound
		}
		log.Error().Err(err).Str("shipmentId", req.ShipmentID).Msg("Failed to validate mp shipment")
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID,
		shipmentID,
		productID,
		warehouseID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to update mp shipment item")
		return nil, err
	}

	log.Info().Str("itemId", itemID.String()).Msg("Mp shipment item updated successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID.String(),
		ShipmentID:       item.ShipmentID.String(),
		ProductID:        item.ProductID.String(),
		WarehouseID:      item.WarehouseID.String(),
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) Delete(ctx context.Context, itemID uuid.UUID) error {
	err := s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to delete mp shipment item")
		return err
	}

	log.Info().Str("itemId", itemID.String()).Msg("Mp shipment item deleted successfully")
	return nil
}
