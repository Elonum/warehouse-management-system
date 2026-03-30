package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

var (
	ErrMpShipmentCompleted = errors.New("mp shipment is completed and cannot be modified")
	ErrInsufficientMainStock            = errors.New("insufficient stock on main warehouses to transfer to marketplace")
	ErrMpDestinationWarehouseInvalid    = errors.New("mp destination warehouse must be marked as marketplace")
)

func isFinalShipmentStatus(status *repository.ShipmentStatus) bool {
	return status != nil && status.IsFinal
}

type InsufficientMainStockError struct {
	ProductID uuid.UUID
	Required  int
	Available int
}

func (e *InsufficientMainStockError) Error() string {
	return fmt.Sprintf("insufficient main stock for product %s: required=%d available=%d", e.ProductID.String(), e.Required, e.Available)
}

type MpShipmentService struct {
	repo               *repository.MpShipmentRepository
	storeRepo          *repository.StoreRepository
	warehouseRepo      *repository.WarehouseRepository
	shipmentStatusRepo *repository.ShipmentStatusRepository
	shipmentItemRepo   *repository.MpShipmentItemRepository
	stockRepo          *repository.StockRepository
}

func NewMpShipmentService(
	repo *repository.MpShipmentRepository,
	storeRepo *repository.StoreRepository,
	warehouseRepo *repository.WarehouseRepository,
	shipmentStatusRepo *repository.ShipmentStatusRepository,
	shipmentItemRepo *repository.MpShipmentItemRepository,
	stockRepo *repository.StockRepository,
) *MpShipmentService {
	return &MpShipmentService{
		repo:               repo,
		storeRepo:          storeRepo,
		warehouseRepo:      warehouseRepo,
		shipmentStatusRepo: shipmentStatusRepo,
		shipmentItemRepo:   shipmentItemRepo,
		stockRepo:          stockRepo,
	}
}

func (s *MpShipmentService) GetByID(ctx context.Context, shipmentID uuid.UUID) (*dto.MpShipmentResponse, error) {
	shipment, err := s.repo.GetByID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to get mp shipment by ID")
		return nil, err
	}

	var storeIDStr *string
	if shipment.StoreID != nil {
		str := shipment.StoreID.String()
		storeIDStr = &str
	}
	var warehouseIDStr *string
	if shipment.WarehouseID != nil {
		str := shipment.WarehouseID.String()
		warehouseIDStr = &str
	}
	var statusIDStr *string
	if shipment.StatusID != nil {
		str := shipment.StatusID.String()
		statusIDStr = &str
	}
	var createdByStr *string
	if shipment.CreatedBy != nil {
		str := shipment.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if shipment.UpdatedBy != nil {
		str := shipment.UpdatedBy.String()
		updatedByStr = &str
	}

	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID.String(),
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        storeIDStr,
		WarehouseID:    warehouseIDStr,
		StatusID:       statusIDStr,
		LogisticsCost:  shipment.LogisticsCost,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      createdByStr,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      updatedByStr,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) List(ctx context.Context, limit, offset int, storeID, warehouseID, statusID *uuid.UUID) ([]dto.MpShipmentResponse, error) {
	shipments, err := s.repo.List(ctx, limit, offset, storeID, warehouseID, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("storeId", storeID).Interface("warehouseId", warehouseID).
			Interface("statusId", statusID).Msg("Failed to list mp shipments")
		return nil, err
	}

	result := make([]dto.MpShipmentResponse, 0, len(shipments))
	for _, shipment := range shipments {
		var storeIDStr *string
		if shipment.StoreID != nil {
			str := shipment.StoreID.String()
			storeIDStr = &str
		}
		var warehouseIDStr *string
		if shipment.WarehouseID != nil {
			str := shipment.WarehouseID.String()
			warehouseIDStr = &str
		}
		var statusIDStr *string
		if shipment.StatusID != nil {
			str := shipment.StatusID.String()
			statusIDStr = &str
		}
		var createdByStr *string
		if shipment.CreatedBy != nil {
			str := shipment.CreatedBy.String()
			createdByStr = &str
		}
		var updatedByStr *string
		if shipment.UpdatedBy != nil {
			str := shipment.UpdatedBy.String()
			updatedByStr = &str
		}

		result = append(result, dto.MpShipmentResponse{
			ShipmentID:     shipment.ShipmentID.String(),
			ShipmentDate:   shipment.ShipmentDate,
			ShipmentNumber: shipment.ShipmentNumber,
			StoreID:        storeIDStr,
			WarehouseID:    warehouseIDStr,
			StatusID:       statusIDStr,
			LogisticsCost:  shipment.LogisticsCost,
			AcceptanceCost: shipment.AcceptanceCost,
			AcceptanceDate: shipment.AcceptanceDate,
			PositionsQty:   shipment.PositionsQty,
			SentQty:        shipment.SentQty,
			AcceptedQty:    shipment.AcceptedQty,
			CreatedBy:      createdByStr,
			CreatedAt:      shipment.CreatedAt,
			UpdatedBy:      updatedByStr,
			UpdatedAt:      shipment.UpdatedAt,
		})
	}

	return result, nil
}

func (s *MpShipmentService) Create(ctx context.Context, userID uuid.UUID, req dto.MpShipmentCreateRequest) (*dto.MpShipmentResponse, error) {
	var storeID *uuid.UUID
	if req.StoreID != nil && *req.StoreID != "" {
		id, err := uuid.Parse(*req.StoreID)
		if err != nil {
			log.Warn().Str("storeId", *req.StoreID).Msg("Invalid store ID format")
			return nil, repository.ErrStoreNotFound
		}
		storeID = &id

		_, err = s.storeRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrStoreNotFound {
				log.Warn().Str("storeId", *req.StoreID).Msg("Store not found")
				return nil, repository.ErrStoreNotFound
			}
			log.Error().Err(err).Str("storeId", *req.StoreID).Msg("Failed to validate store")
			return nil, err
		}
	}

	var warehouseID *uuid.UUID
	if req.WarehouseID != nil && *req.WarehouseID != "" {
		id, err := uuid.Parse(*req.WarehouseID)
		if err != nil {
			log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Invalid warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		warehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("warehouseId", *req.WarehouseID).Msg("Failed to validate warehouse")
			return nil, err
		}
		if !warehouse.IsMarketplace {
			log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Destination warehouse must be marketplace")
			return nil, ErrMpDestinationWarehouseInvalid
		}
	}

	var statusID *uuid.UUID
	if req.StatusID != nil && *req.StatusID != "" {
		id, err := uuid.Parse(*req.StatusID)
		if err != nil {
			log.Warn().Str("statusId", *req.StatusID).Msg("Invalid status ID format")
			return nil, repository.ErrShipmentStatusNotFound
		}
		statusID = &id

		_, err = s.shipmentStatusRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrShipmentStatusNotFound {
				log.Warn().Str("statusId", *req.StatusID).Msg("Shipment status not found")
				return nil, repository.ErrShipmentStatusNotFound
			}
			log.Error().Err(err).Str("statusId", *req.StatusID).Msg("Failed to validate shipment status")
			return nil, err
		}
	}

	shipment, err := s.repo.Create(ctx,
		req.ShipmentDate,
		req.ShipmentNumber,
		storeID,
		warehouseID,
		statusID,
		req.LogisticsCost,
		req.AcceptanceCost,
		req.AcceptanceDate,
		0,
		0,
		0,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("shipmentNumber", req.ShipmentNumber).Str("userId", userID.String()).Msg("Failed to create mp shipment")
		return nil, err
	}

	var storeIDStr *string
	if shipment.StoreID != nil {
		str := shipment.StoreID.String()
		storeIDStr = &str
	}
	var warehouseIDStr *string
	if shipment.WarehouseID != nil {
		str := shipment.WarehouseID.String()
		warehouseIDStr = &str
	}
	var statusIDStr *string
	if shipment.StatusID != nil {
		str := shipment.StatusID.String()
		statusIDStr = &str
	}
	var createdByStr *string
	if shipment.CreatedBy != nil {
		str := shipment.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if shipment.UpdatedBy != nil {
		str := shipment.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("shipmentId", shipment.ShipmentID.String()).Str("shipmentNumber", shipment.ShipmentNumber).Str("userId", userID.String()).Msg("Mp shipment created successfully")
	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID.String(),
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        storeIDStr,
		WarehouseID:    warehouseIDStr,
		StatusID:       statusIDStr,
		LogisticsCost:  shipment.LogisticsCost,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      createdByStr,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      updatedByStr,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) Update(ctx context.Context, shipmentID, userID uuid.UUID, req dto.MpShipmentUpdateRequest) (*dto.MpShipmentResponse, error) {
	var storeID *uuid.UUID
	if req.StoreID != nil && *req.StoreID != "" {
		id, err := uuid.Parse(*req.StoreID)
		if err != nil {
			log.Warn().Str("storeId", *req.StoreID).Msg("Invalid store ID format")
			return nil, repository.ErrStoreNotFound
		}
		storeID = &id

		_, err = s.storeRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrStoreNotFound {
				log.Warn().Str("storeId", *req.StoreID).Msg("Store not found")
				return nil, repository.ErrStoreNotFound
			}
			log.Error().Err(err).Str("storeId", *req.StoreID).Msg("Failed to validate store")
			return nil, err
		}
	}

	var warehouseID *uuid.UUID
	if req.WarehouseID != nil && *req.WarehouseID != "" {
		id, err := uuid.Parse(*req.WarehouseID)
		if err != nil {
			log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Invalid warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		warehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("warehouseId", *req.WarehouseID).Msg("Failed to validate warehouse")
			return nil, err
		}
		if !warehouse.IsMarketplace {
			log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Destination warehouse must be marketplace")
			return nil, ErrMpDestinationWarehouseInvalid
		}
	}

	targetStatusIsFinal := false
	var statusID *uuid.UUID
	if req.StatusID != nil && *req.StatusID != "" {
		id, err := uuid.Parse(*req.StatusID)
		if err != nil {
			log.Warn().Str("statusId", *req.StatusID).Msg("Invalid status ID format")
			return nil, repository.ErrShipmentStatusNotFound
		}
		statusID = &id

		status, err := s.shipmentStatusRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrShipmentStatusNotFound {
				log.Warn().Str("statusId", *req.StatusID).Msg("Shipment status not found")
				return nil, repository.ErrShipmentStatusNotFound
			}
			log.Error().Err(err).Str("statusId", *req.StatusID).Msg("Failed to validate shipment status")
			return nil, err
		}
		targetStatusIsFinal = isFinalShipmentStatus(status)
	}

	// Preserve aggregates: derived from shipment items.
	existing, err := s.repo.GetByID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to load existing mp shipment for update")
		return nil, err
	}

	currentStatusIsFinal := false
	if existing.StatusID != nil {
		currentStatus, statusErr := s.shipmentStatusRepo.GetByID(ctx, *existing.StatusID)
		if statusErr != nil {
			log.Error().Err(statusErr).Str("shipmentId", shipmentID.String()).Msg("Failed to load current shipment status for completion check")
			return nil, statusErr
		}
		currentStatusIsFinal = currentStatus.IsFinal
	}

	if currentStatusIsFinal {
		return nil, ErrMpShipmentCompleted
	}

	becomesFinal := req.StatusID != nil && targetStatusIsFinal && !currentStatusIsFinal
	if becomesFinal && req.AcceptanceDate == nil {
		// Ensure stock application has a meaningful acceptance date.
		if existing.AcceptanceDate != nil {
			req.AcceptanceDate = existing.AcceptanceDate
		} else {
			now := time.Now().UTC()
			req.AcceptanceDate = &now
		}
	}

	shipment, err := s.repo.Update(ctx, shipmentID,
		req.ShipmentDate,
		req.ShipmentNumber,
		storeID,
		warehouseID,
		statusID,
		req.LogisticsCost,
		req.AcceptanceCost,
		req.AcceptanceDate,
		existing.PositionsQty,
		existing.SentQty,
		existing.AcceptedQty,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Str("userId", userID.String()).Msg("Failed to update mp shipment")
		return nil, err
	}

	if becomesFinal {
		if applyErr := s.applyAcceptedToStock(ctx, shipment, userID); applyErr != nil {
			log.Error().
				Err(applyErr).
				Str("shipmentId", shipmentID.String()).
				Str("userId", userID.String()).
				Msg("Failed to apply accepted quantities to stock for completed mp shipment")
			return nil, applyErr
		}
	}

	var storeIDStr *string
	if shipment.StoreID != nil {
		str := shipment.StoreID.String()
		storeIDStr = &str
	}
	var warehouseIDStr *string
	if shipment.WarehouseID != nil {
		str := shipment.WarehouseID.String()
		warehouseIDStr = &str
	}
	var statusIDStr *string
	if shipment.StatusID != nil {
		str := shipment.StatusID.String()
		statusIDStr = &str
	}
	var createdByStr *string
	if shipment.CreatedBy != nil {
		str := shipment.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if shipment.UpdatedBy != nil {
		str := shipment.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("shipmentId", shipmentID.String()).Str("userId", userID.String()).Msg("Mp shipment updated successfully")
	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID.String(),
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        storeIDStr,
		WarehouseID:    warehouseIDStr,
		StatusID:       statusIDStr,
		LogisticsCost:  shipment.LogisticsCost,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      createdByStr,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      updatedByStr,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) Delete(ctx context.Context, shipmentID uuid.UUID) error {
	shipment, err := s.repo.GetByID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to load mp shipment before delete")
		return err
	}

	if shipment.StatusID != nil {
		status, statusErr := s.shipmentStatusRepo.GetByID(ctx, *shipment.StatusID)
		if statusErr != nil {
			log.Error().Err(statusErr).Str("shipmentId", shipmentID.String()).Msg("Failed to load shipment status before delete")
			return statusErr
		}
		if isFinalShipmentStatus(status) {
			log.Warn().Str("shipmentId", shipmentID.String()).Msg("Attempt to delete completed mp shipment")
			return ErrMpShipmentCompleted
		}
	}

	err = s.repo.Delete(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to delete mp shipment")
		return err
	}

	log.Info().Str("shipmentId", shipmentID.String()).Msg("Mp shipment deleted successfully")
	return nil
}

// applyAcceptedToStock applies accepted quantities from a completed mp shipment to stock snapshots.
// It runs only once when the shipment transitions from non-final to final status.
func (s *MpShipmentService) applyAcceptedToStock(ctx context.Context, shipment *repository.MpShipment, userID uuid.UUID) error {
	if shipment.WarehouseID == nil {
		log.Warn().Str("shipmentId", shipment.ShipmentID.String()).Msg("Cannot apply shipment to stock: warehouse is not set")
		return repository.ErrWarehouseNotFound
	}

	items, err := s.shipmentItemRepo.GetByShipmentID(ctx, shipment.ShipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipment.ShipmentID.String()).Msg("Failed to load mp shipment items for stock application")
		return err
	}
	if len(items) == 0 {
		log.Info().Str("shipmentId", shipment.ShipmentID.String()).Msg("No items to apply to stock for completed mp shipment")
		return nil
	}

	// mp_shipments.warehouse_id считается складом МП назначения.
	destWarehouseID := *shipment.WarehouseID
	destWarehouse, err := s.warehouseRepo.GetByID(ctx, destWarehouseID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipment.ShipmentID.String()).Str("destWarehouseId", destWarehouseID.String()).Msg("Failed to load destination warehouse for mp shipment")
		return err
	}
	if !destWarehouse.IsMarketplace {
		log.Warn().
			Str("shipmentId", shipment.ShipmentID.String()).
			Str("destWarehouseId", destWarehouseID.String()).
			Msg("Destination warehouse is not marked as marketplace")
		return ErrMpDestinationWarehouseInvalid
	}

	// snapshotDate пишем не раньше "сейчас", чтобы vw_current_stock не добавлял движения повторно.
	snapshotDate := time.Now().UTC()
	if shipment.AcceptanceDate != nil && shipment.AcceptanceDate.After(snapshotDate) {
		snapshotDate = shipment.AcceptanceDate.UTC()
	}

	// Пропускаем товары с нулевым принятым кол-вом и агрегируем по продуктам.
	totalAcceptedByProduct := make(map[uuid.UUID]int)
	for _, it := range items {
		if it.AcceptedQty <= 0 {
			continue
		}
		totalAcceptedByProduct[it.ProductID] += it.AcceptedQty
	}
	if len(totalAcceptedByProduct) == 0 {
		log.Info().Str("shipmentId", shipment.ShipmentID.String()).Msg("No accepted quantities to apply to stock for completed mp shipment")
		return nil
	}

	marketplaceWarehouseIDs, err := s.getMarketplaceWarehouseIDs(ctx, destWarehouseID)
	if err != nil {
		return err
	}

	// Для каждого продукта забираем qty с main-складов (вне marketplace) и добавляем на склад МП.
	appliedProducts := 0
	for productID, requiredQty := range totalAcceptedByProduct {
		allocations, available, err := s.allocateFromMainWarehouses(ctx, productID, requiredQty, marketplaceWarehouseIDs, destWarehouseID)
		if err != nil {
			return &InsufficientMainStockError{
				ProductID: productID,
				Required:  requiredQty,
				Available: available,
			}
		}

		// 1) Вычитаем с main-складов
		for _, a := range allocations {
			if err := s.stockRepo.ApplyStockDelta(ctx, productID, a.warehouseID, snapshotDate, -a.qty, &userID); err != nil {
				log.Error().
					Err(err).
					Str("shipmentId", shipment.ShipmentID.String()).
					Str("productId", productID.String()).
					Str("sourceWarehouseId", a.warehouseID.String()).
					Int("qty", a.qty).
					Time("snapshotDate", snapshotDate).
					Msg("Failed to apply mp transfer out from main warehouse")
				return err
			}
		}

		// 2) Прибавляем на склад МП назначения
		if err := s.stockRepo.ApplyStockDelta(ctx, productID, destWarehouseID, snapshotDate, requiredQty, &userID); err != nil {
			log.Error().
				Err(err).
				Str("shipmentId", shipment.ShipmentID.String()).
				Str("productId", productID.String()).
				Str("destWarehouseId", destWarehouseID.String()).
				Int("qty", requiredQty).
				Time("snapshotDate", snapshotDate).
				Msg("Failed to apply mp transfer in to destination warehouse")
			return err
		}

		appliedProducts++
	}

	log.Info().
		Str("shipmentId", shipment.ShipmentID.String()).
		Int("appliedProducts", appliedProducts).
		Msg("Successfully transferred mp shipment accepted quantities from main warehouses to marketplace destination")

	return nil
}

type sourceAllocation struct {
	warehouseID uuid.UUID
	qty         int
}

func (s *MpShipmentService) getMarketplaceWarehouseIDs(ctx context.Context, destWarehouseID uuid.UUID) (map[uuid.UUID]struct{}, error) {
	warehouses, err := s.warehouseRepo.List(ctx, 5000, 0)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list warehouses while detecting marketplace warehouses")
		return nil, err
	}

	result, hadMarketplace := collectMarketplaceWarehouseIDs(warehouses, destWarehouseID)
	// Fallback: всегда гарантируем, что destination не будет считаться source.
	if !hadMarketplace {
		log.Warn().Msg("No marketplace warehouses configured. Set warehouses.is_marketplace=true for marketplace destination warehouses.")
	}

	return result, nil
}

func collectMarketplaceWarehouseIDs(warehouses []repository.Warehouse, destWarehouseID uuid.UUID) (map[uuid.UUID]struct{}, bool) {
	result := make(map[uuid.UUID]struct{})
	hadMarketplace := false
	for _, w := range warehouses {
		if w.IsMarketplace {
			result[w.WarehouseID] = struct{}{}
			hadMarketplace = true
		}
	}
	// Destination must never be considered as source allocation candidate.
	if _, ok := result[destWarehouseID]; !ok {
		result[destWarehouseID] = struct{}{}
	}
	return result, hadMarketplace
}

func (s *MpShipmentService) allocateFromMainWarehouses(
	ctx context.Context,
	productID uuid.UUID,
	requiredQty int,
	marketplaceWarehouseIDs map[uuid.UUID]struct{},
	destWarehouseID uuid.UUID,
) ([]sourceAllocation, int, error) {
	if requiredQty <= 0 {
		return nil, 0, nil
	}

	stocks, err := s.stockRepo.GetCurrentStock(
		ctx,
		nil,
		&productID,
		nil,
		repository.StockLevelFilterPositive,
		5000,
		0,
	)
	if err != nil {
		return nil, 0, err
	}

	sources := make([]sourceAllocation, 0, len(stocks))
	totalAvailable := 0
	for _, st := range stocks {
		// источники: все не-marketplace склады и не destination
		if st.WarehouseID == destWarehouseID {
			continue
		}
		if _, ok := marketplaceWarehouseIDs[st.WarehouseID]; ok {
			continue
		}
		if st.CurrentQuantity <= 0 {
			continue
		}
		sources = append(sources, sourceAllocation{warehouseID: st.WarehouseID, qty: st.CurrentQuantity})
		totalAvailable += st.CurrentQuantity
	}

	if totalAvailable < requiredQty {
		return nil, totalAvailable, fmt.Errorf("insufficient stock")
	}

	// Детерминированный порядок списания.
	sort.Slice(sources, func(i, j int) bool {
		if sources[i].qty != sources[j].qty {
			return sources[i].qty > sources[j].qty
		}
		// UUID сравниваем строковым образом для стабильности
		return sources[i].warehouseID.String() < sources[j].warehouseID.String()
	})

	allocations, _, err := allocateFromSortedSources(requiredQty, sources)
	return allocations, totalAvailable, err
}

// allocateFromSortedSources consumes requiredQty from sources in order.
// sources must be pre-sorted deterministically.
func allocateFromSortedSources(requiredQty int, sources []sourceAllocation) ([]sourceAllocation, int, error) {
	remaining := requiredQty
	allocations := make([]sourceAllocation, 0, len(sources))
	totalAvailable := 0
	for _, src := range sources {
		totalAvailable += src.qty
	}
	for _, src := range sources {
		if remaining == 0 {
			break
		}
		if src.qty <= 0 {
			continue
		}
		take := src.qty
		if take > remaining {
			take = remaining
		}
		if take > 0 {
			allocations = append(allocations, sourceAllocation{warehouseID: src.warehouseID, qty: take})
			remaining -= take
		}
	}
	if remaining != 0 {
		return nil, totalAvailable, fmt.Errorf("insufficient stock")
	}
	return allocations, totalAvailable, nil
}
