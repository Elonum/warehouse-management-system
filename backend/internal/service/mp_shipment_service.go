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
	ErrMpShipmentCompleted = errors.New("mp shipment is completed and cannot be modified")
	ErrInsufficientMainStock            = errors.New("insufficient stock on main warehouses to transfer to marketplace")
	ErrMpDestinationWarehouseInvalid    = errors.New("mp destination warehouse must be marked as marketplace")
	ErrMpSourceWarehouseInvalid         = errors.New("mp source warehouse must NOT be marked as marketplace")
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

// NOTE: Previously we supported automatic allocation across multiple main warehouses.
// The current model explicitly stores both main and marketplace warehouses on the shipment,
// so the allocation helpers were removed.

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
	var mainWarehouseIDStr *string
	if shipment.MainWarehouseID != nil {
		str := shipment.MainWarehouseID.String()
		mainWarehouseIDStr = &str
	}
	var mpWarehouseIDStr *string
	if shipment.MpWarehouseID != nil {
		str := shipment.MpWarehouseID.String()
		mpWarehouseIDStr = &str
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
		MainWarehouseID: mainWarehouseIDStr,
		MpWarehouseID:   mpWarehouseIDStr,
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
		var mainWarehouseIDStr *string
		if shipment.MainWarehouseID != nil {
			str := shipment.MainWarehouseID.String()
			mainWarehouseIDStr = &str
		}
		var mpWarehouseIDStr *string
		if shipment.MpWarehouseID != nil {
			str := shipment.MpWarehouseID.String()
			mpWarehouseIDStr = &str
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
			MainWarehouseID: mainWarehouseIDStr,
			MpWarehouseID:   mpWarehouseIDStr,
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

	var mainWarehouseID *uuid.UUID
	if req.MainWarehouseID != nil && *req.MainWarehouseID != "" {
		id, err := uuid.Parse(*req.MainWarehouseID)
		if err != nil {
			log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Invalid main warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		mainWarehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Main warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("mainWarehouseId", *req.MainWarehouseID).Msg("Failed to validate main warehouse")
			return nil, err
		}
		if warehouse.IsMarketplace {
			log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Source warehouse must be main (non-marketplace)")
			return nil, ErrMpSourceWarehouseInvalid
		}
	}

	var mpWarehouseID *uuid.UUID
	if req.MpWarehouseID != nil && *req.MpWarehouseID != "" {
		id, err := uuid.Parse(*req.MpWarehouseID)
		if err != nil {
			log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Invalid mp warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		mpWarehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Marketplace warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("mpWarehouseId", *req.MpWarehouseID).Msg("Failed to validate marketplace warehouse")
			return nil, err
		}
		if !warehouse.IsMarketplace {
			log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Destination warehouse must be marketplace")
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
		mainWarehouseID,
		mpWarehouseID,
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
	var mainWarehouseIDStr2 *string
	if shipment.MainWarehouseID != nil {
		str := shipment.MainWarehouseID.String()
		mainWarehouseIDStr2 = &str
	}
	var mpWarehouseIDStr2 *string
	if shipment.MpWarehouseID != nil {
		str := shipment.MpWarehouseID.String()
		mpWarehouseIDStr2 = &str
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
		MainWarehouseID: mainWarehouseIDStr2,
		MpWarehouseID:   mpWarehouseIDStr2,
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

	var mainWarehouseID *uuid.UUID
	if req.MainWarehouseID != nil && *req.MainWarehouseID != "" {
		id, err := uuid.Parse(*req.MainWarehouseID)
		if err != nil {
			log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Invalid main warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		mainWarehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Main warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("mainWarehouseId", *req.MainWarehouseID).Msg("Failed to validate main warehouse")
			return nil, err
		}
		if warehouse.IsMarketplace {
			log.Warn().Str("mainWarehouseId", *req.MainWarehouseID).Msg("Source warehouse must be main (non-marketplace)")
			return nil, ErrMpSourceWarehouseInvalid
		}
	}

	var mpWarehouseID *uuid.UUID
	if req.MpWarehouseID != nil && *req.MpWarehouseID != "" {
		id, err := uuid.Parse(*req.MpWarehouseID)
		if err != nil {
			log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Invalid mp warehouse ID format")
			return nil, repository.ErrWarehouseNotFound
		}
		mpWarehouseID = &id

		warehouse, err := s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Marketplace warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("mpWarehouseId", *req.MpWarehouseID).Msg("Failed to validate marketplace warehouse")
			return nil, err
		}
		if !warehouse.IsMarketplace {
			log.Warn().Str("mpWarehouseId", *req.MpWarehouseID).Msg("Destination warehouse must be marketplace")
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
		mainWarehouseID,
		mpWarehouseID,
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
	var mainWarehouseIDStr *string
	if shipment.MainWarehouseID != nil {
		str := shipment.MainWarehouseID.String()
		mainWarehouseIDStr = &str
	}
	var mpWarehouseIDStr *string
	if shipment.MpWarehouseID != nil {
		str := shipment.MpWarehouseID.String()
		mpWarehouseIDStr = &str
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
		MainWarehouseID: mainWarehouseIDStr,
		MpWarehouseID:   mpWarehouseIDStr,
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
	if shipment.MainWarehouseID == nil || shipment.MpWarehouseID == nil {
		log.Warn().Str("shipmentId", shipment.ShipmentID.String()).Msg("Cannot apply shipment to stock: warehouses are not set")
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

	mainWarehouseID := *shipment.MainWarehouseID
	mpWarehouseID := *shipment.MpWarehouseID

	mainWarehouse, err := s.warehouseRepo.GetByID(ctx, mainWarehouseID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipment.ShipmentID.String()).Str("mainWarehouseId", mainWarehouseID.String()).Msg("Failed to load main warehouse for mp shipment")
		return err
	}
	if mainWarehouse.IsMarketplace {
		log.Warn().Str("shipmentId", shipment.ShipmentID.String()).Str("mainWarehouseId", mainWarehouseID.String()).Msg("Main warehouse must not be marketplace")
		return ErrMpSourceWarehouseInvalid
	}

	destWarehouse, err := s.warehouseRepo.GetByID(ctx, mpWarehouseID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipment.ShipmentID.String()).Str("mpWarehouseId", mpWarehouseID.String()).Msg("Failed to load mp warehouse for mp shipment")
		return err
	}
	if !destWarehouse.IsMarketplace {
		log.Warn().
			Str("shipmentId", shipment.ShipmentID.String()).
			Str("mpWarehouseId", mpWarehouseID.String()).
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

	// Для каждого продукта списываем qty с выбранного основного склада и добавляем на склад МП.
	appliedProducts := 0
	for productID, requiredQty := range totalAcceptedByProduct {
		st, err := s.stockRepo.GetCurrentStock(
			ctx,
			&mainWarehouseID,
			&productID,
			nil,
			repository.StockLevelFilterAll,
			1,
			0,
		)
		if err != nil {
			return err
		}
		available := 0
		if len(st) > 0 {
			available = st[0].CurrentQuantity
		}
		if available < requiredQty {
			return &InsufficientMainStockError{
				ProductID: productID,
				Required:  requiredQty,
				Available: available,
			}
		}

		if err := s.stockRepo.ApplyStockDelta(ctx, productID, mainWarehouseID, snapshotDate, -requiredQty, &userID); err != nil {
			log.Error().
				Err(err).
				Str("shipmentId", shipment.ShipmentID.String()).
				Str("productId", productID.String()).
				Str("mainWarehouseId", mainWarehouseID.String()).
				Int("qty", requiredQty).
				Time("snapshotDate", snapshotDate).
				Msg("Failed to apply mp transfer out from main warehouse")
			return err
		}

		if err := s.stockRepo.ApplyStockDelta(ctx, productID, mpWarehouseID, snapshotDate, requiredQty, &userID); err != nil {
			log.Error().
				Err(err).
				Str("shipmentId", shipment.ShipmentID.String()).
				Str("productId", productID.String()).
				Str("mpWarehouseId", mpWarehouseID.String()).
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
		Msg("Successfully transferred mp shipment accepted quantities from main warehouse to marketplace destination")

	return nil
}
