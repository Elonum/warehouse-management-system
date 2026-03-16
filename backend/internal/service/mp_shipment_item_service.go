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
}

func NewMpShipmentItemService(repo *repository.MpShipmentItemRepository, shipmentRepo *repository.MpShipmentRepository, productRepo *repository.ProductRepository) *MpShipmentItemService {
	return &MpShipmentItemService{
		repo:          repo,
		shipmentRepo:  shipmentRepo,
		productRepo:   productRepo,
	}
}

func (s *MpShipmentItemService) recalcAndUpdateShipmentAggregates(ctx context.Context, shipmentID uuid.UUID) error {
	items, err := s.repo.GetByShipmentID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to load shipment items for aggregation")
		return err
	}

	positionsQty := len(items)
	sentQty := 0
	acceptedQty := 0
	for _, it := range items {
		sentQty += it.SentQty
		acceptedQty += it.AcceptedQty
	}

	if err := s.shipmentRepo.UpdateAggregates(ctx, shipmentID, positionsQty, sentQty, acceptedQty, nil); err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to update shipment aggregates")
		return err
	}
	return nil
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
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
		TotalLogisticsForItem: item.TotalLogisticsForItem,
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
			SentQty:          item.SentQty,
			AcceptedQty:      item.AcceptedQty,
			LogisticsForItem: item.LogisticsForItem,
			TotalLogisticsForItem: item.TotalLogisticsForItem,
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Create(ctx,
		shipmentID,
		productID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
		req.TotalLogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", req.ShipmentID).Str("productId", req.ProductID).Msg("Failed to create mp shipment item")
		return nil, err
	}

	if aggErr := s.recalcAndUpdateShipmentAggregates(ctx, shipmentID); aggErr != nil {
		log.Error().Err(aggErr).Str("shipmentId", req.ShipmentID).Msg("Failed to recalc shipment aggregates after item create")
	}

	log.Info().Str("shipmentItemId", item.ShipmentItemID.String()).Str("shipmentId", req.ShipmentID).Str("productId", req.ProductID).Msg("Mp shipment item created successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID.String(),
		ShipmentID:       item.ShipmentID.String(),
		ProductID:        item.ProductID.String(),
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
		TotalLogisticsForItem: item.TotalLogisticsForItem,
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	item, err := s.repo.Update(ctx, itemID,
		shipmentID,
		productID,
		req.SentQty,
		req.AcceptedQty,
		req.LogisticsForItem,
		req.TotalLogisticsForItem,
	)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to update mp shipment item")
		return nil, err
	}

	if aggErr := s.recalcAndUpdateShipmentAggregates(ctx, shipmentID); aggErr != nil {
		log.Error().Err(aggErr).Str("shipmentId", req.ShipmentID).Msg("Failed to recalc shipment aggregates after item update")
	}

	log.Info().Str("itemId", itemID.String()).Msg("Mp shipment item updated successfully")
	return &dto.MpShipmentItemResponse{
		ShipmentItemID:   item.ShipmentItemID.String(),
		ShipmentID:       item.ShipmentID.String(),
		ProductID:        item.ProductID.String(),
		SentQty:          item.SentQty,
		AcceptedQty:      item.AcceptedQty,
		LogisticsForItem: item.LogisticsForItem,
		TotalLogisticsForItem: item.TotalLogisticsForItem,
	}, nil
}

func (s *MpShipmentItemService) Delete(ctx context.Context, itemID uuid.UUID) error {
	item, err := s.repo.GetByID(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to load mp shipment item before deletion")
		return err
	}

	err = s.repo.Delete(ctx, itemID)
	if err != nil {
		log.Error().Err(err).Str("itemId", itemID.String()).Msg("Failed to delete mp shipment item")
		return err
	}

	if aggErr := s.recalcAndUpdateShipmentAggregates(ctx, item.ShipmentID); aggErr != nil {
		log.Error().Err(aggErr).Str("shipmentId", item.ShipmentID.String()).Msg("Failed to recalc shipment aggregates after item delete")
	}

	log.Info().Str("itemId", itemID.String()).Msg("Mp shipment item deleted successfully")
	return nil
}
