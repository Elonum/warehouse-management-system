package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type MpShipmentService struct {
	repo *repository.MpShipmentRepository
}

func NewMpShipmentService(repo *repository.MpShipmentRepository) *MpShipmentService {
	return &MpShipmentService{repo: repo}
}

func (s *MpShipmentService) GetByID(ctx context.Context, shipmentID int) (*dto.MpShipmentResponse, error) {
	shipment, err := s.repo.GetByID(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to get mp shipment by ID")
		return nil, err
	}

	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID,
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        shipment.StoreID,
		WarehouseID:    shipment.WarehouseID,
		StatusID:       shipment.StatusID,
		LogisticsCost:  shipment.LogisticsCost,
		UnitLogistics:  shipment.UnitLogistics,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      shipment.CreatedBy,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      shipment.UpdatedBy,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) List(ctx context.Context, limit, offset int, storeID, warehouseID, statusID *int) ([]dto.MpShipmentResponse, error) {
	shipments, err := s.repo.List(ctx, limit, offset, storeID, warehouseID, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("storeId", storeID).Interface("warehouseId", warehouseID).
			Interface("statusId", statusID).Msg("Failed to list mp shipments")
		return nil, err
	}

	result := make([]dto.MpShipmentResponse, 0, len(shipments))
	for _, shipment := range shipments {
		result = append(result, dto.MpShipmentResponse{
			ShipmentID:     shipment.ShipmentID,
			ShipmentDate:   shipment.ShipmentDate,
			ShipmentNumber: shipment.ShipmentNumber,
			StoreID:        shipment.StoreID,
			WarehouseID:    shipment.WarehouseID,
			StatusID:       shipment.StatusID,
			LogisticsCost:  shipment.LogisticsCost,
			UnitLogistics:  shipment.UnitLogistics,
			AcceptanceCost: shipment.AcceptanceCost,
			AcceptanceDate: shipment.AcceptanceDate,
			PositionsQty:   shipment.PositionsQty,
			SentQty:        shipment.SentQty,
			AcceptedQty:    shipment.AcceptedQty,
			CreatedBy:      shipment.CreatedBy,
			CreatedAt:      shipment.CreatedAt,
			UpdatedBy:      shipment.UpdatedBy,
			UpdatedAt:      shipment.UpdatedAt,
		})
	}

	return result, nil
}

func (s *MpShipmentService) Create(ctx context.Context, userID int, req dto.MpShipmentCreateRequest) (*dto.MpShipmentResponse, error) {
	shipment, err := s.repo.Create(ctx,
		req.ShipmentDate,
		req.ShipmentNumber,
		req.StoreID,
		req.WarehouseID,
		req.StatusID,
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
		log.Error().Err(err).Str("shipmentNumber", req.ShipmentNumber).Int("userId", userID).Msg("Failed to create mp shipment")
		return nil, err
	}

	log.Info().Int("shipmentId", shipment.ShipmentID).Str("shipmentNumber", shipment.ShipmentNumber).Int("userId", userID).Msg("Mp shipment created successfully")
	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID,
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        shipment.StoreID,
		WarehouseID:    shipment.WarehouseID,
		StatusID:       shipment.StatusID,
		LogisticsCost:  shipment.LogisticsCost,
		UnitLogistics:  shipment.UnitLogistics,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      shipment.CreatedBy,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      shipment.UpdatedBy,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) Update(ctx context.Context, shipmentID, userID int, req dto.MpShipmentUpdateRequest) (*dto.MpShipmentResponse, error) {
	shipment, err := s.repo.Update(ctx, shipmentID,
		req.ShipmentDate,
		req.ShipmentNumber,
		req.StoreID,
		req.WarehouseID,
		req.StatusID,
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
		log.Error().Err(err).Int("shipmentId", shipmentID).Int("userId", userID).Msg("Failed to update mp shipment")
		return nil, err
	}

	log.Info().Int("shipmentId", shipmentID).Int("userId", userID).Msg("Mp shipment updated successfully")
	return &dto.MpShipmentResponse{
		ShipmentID:     shipment.ShipmentID,
		ShipmentDate:   shipment.ShipmentDate,
		ShipmentNumber: shipment.ShipmentNumber,
		StoreID:        shipment.StoreID,
		WarehouseID:    shipment.WarehouseID,
		StatusID:       shipment.StatusID,
		LogisticsCost:  shipment.LogisticsCost,
		UnitLogistics:  shipment.UnitLogistics,
		AcceptanceCost: shipment.AcceptanceCost,
		AcceptanceDate: shipment.AcceptanceDate,
		PositionsQty:   shipment.PositionsQty,
		SentQty:        shipment.SentQty,
		AcceptedQty:    shipment.AcceptedQty,
		CreatedBy:      shipment.CreatedBy,
		CreatedAt:      shipment.CreatedAt,
		UpdatedBy:      shipment.UpdatedBy,
		UpdatedAt:      shipment.UpdatedAt,
	}, nil
}

func (s *MpShipmentService) Delete(ctx context.Context, shipmentID int) error {
	err := s.repo.Delete(ctx, shipmentID)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to delete mp shipment")
		return err
	}

	log.Info().Int("shipmentId", shipmentID).Msg("Mp shipment deleted successfully")
	return nil
}
