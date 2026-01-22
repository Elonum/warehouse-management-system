package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type MpShipmentService struct {
	repo               *repository.MpShipmentRepository
	storeRepo          *repository.StoreRepository
	warehouseRepo      *repository.WarehouseRepository
	shipmentStatusRepo *repository.ShipmentStatusRepository
}

func NewMpShipmentService(repo *repository.MpShipmentRepository, storeRepo *repository.StoreRepository, warehouseRepo *repository.WarehouseRepository, shipmentStatusRepo *repository.ShipmentStatusRepository) *MpShipmentService {
	return &MpShipmentService{
		repo:               repo,
		storeRepo:          storeRepo,
		warehouseRepo:      warehouseRepo,
		shipmentStatusRepo: shipmentStatusRepo,
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
		UnitLogistics:  shipment.UnitLogistics,
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
			UnitLogistics:  shipment.UnitLogistics,
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

		_, err = s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("warehouseId", *req.WarehouseID).Msg("Failed to validate warehouse")
			return nil, err
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	shipment, err := s.repo.Create(ctx,
		req.ShipmentDate,
		req.ShipmentNumber,
		storeID,
		warehouseID,
		statusID,
		req.LogisticsCost,
		req.UnitLogistics,
		req.AcceptanceCost,
		req.AcceptanceDate,
		req.PositionsQty,
		req.SentQty,
		req.AcceptedQty,
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
		UnitLogistics:  shipment.UnitLogistics,
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

		_, err = s.warehouseRepo.GetByID(ctx, id)
		if err != nil {
			if err == repository.ErrWarehouseNotFound {
				log.Warn().Str("warehouseId", *req.WarehouseID).Msg("Warehouse not found")
				return nil, repository.ErrWarehouseNotFound
			}
			log.Error().Err(err).Str("warehouseId", *req.WarehouseID).Msg("Failed to validate warehouse")
			return nil, err
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

	if req.AcceptedQty > req.SentQty {
		log.Warn().Int("sentQty", req.SentQty).Int("acceptedQty", req.AcceptedQty).Msg("Accepted quantity cannot exceed sent quantity")
		return nil, repository.ErrInvalidQuantity
	}

	shipment, err := s.repo.Update(ctx, shipmentID,
		req.ShipmentDate,
		req.ShipmentNumber,
		storeID,
		warehouseID,
		statusID,
		req.LogisticsCost,
		req.UnitLogistics,
		req.AcceptanceCost,
		req.AcceptanceDate,
		req.PositionsQty,
		req.SentQty,
		req.AcceptedQty,
		&userID,
	)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Str("userId", userID.String()).Msg("Failed to update mp shipment")
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

	log.Info().Str("shipmentId", shipmentID.String()).Str("userId", userID.String()).Msg("Mp shipment updated successfully")
	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID.String(),
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        storeIDStr,
		WarehouseID:    warehouseIDStr,
		StatusID:       statusIDStr,
		LogisticsCost:  shipment.LogisticsCost,
		UnitLogistics:  shipment.UnitLogistics,
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
	err := s.repo.Delete(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Str("shipmentId", shipmentID.String()).Msg("Failed to delete mp shipment")
		return err
	}

	log.Info().Str("shipmentId", shipmentID.String()).Msg("Mp shipment deleted successfully")
	return nil
}
