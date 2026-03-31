package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrMpShipmentNotFound = errors.New("mp shipment not found")
	ErrMpShipmentExists   = errors.New("mp shipment already exists")
)

type MpShipment struct {
	ShipmentID     uuid.UUID
	ShipmentDate   *time.Time
	ShipmentNumber string
	StoreID        *uuid.UUID
	MainWarehouseID *uuid.UUID
	MpWarehouseID   *uuid.UUID
	StatusID       *uuid.UUID
	LogisticsCost  *float64
	AcceptanceCost *float64
	AcceptanceDate *time.Time
	PositionsQty   int
	SentQty        int
	AcceptedQty    int
	CreatedBy      *uuid.UUID
	CreatedAt      time.Time
	UpdatedBy      *uuid.UUID
	UpdatedAt      time.Time
}

type MpShipmentRepository struct {
	pool *pgxpool.Pool
}

func NewMpShipmentRepository(pool *pgxpool.Pool) *MpShipmentRepository {
	return &MpShipmentRepository{pool: pool}
}

func (r *MpShipmentRepository) GetByID(ctx context.Context, shipmentID uuid.UUID) (*MpShipment, error) {
	query := `
		SELECT shipment_id, shipment_date, shipment_number, store_id, main_warehouse_id, mp_warehouse_id,
		       status_id, logistics_cost, acceptance_cost,
		       acceptance_date, positions_qty, sent_qty, accepted_qty,
		       created_by, created_at, updated_by, updated_at
		FROM mp_shipments
		WHERE shipment_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var shipment MpShipment
	err := r.pool.QueryRow(ctx, query, shipmentID).Scan(
		&shipment.ShipmentID,
		&shipment.ShipmentDate,
		&shipment.ShipmentNumber,
		&shipment.StoreID,
		&shipment.MainWarehouseID,
		&shipment.MpWarehouseID,
		&shipment.StatusID,
		&shipment.LogisticsCost,
		&shipment.AcceptanceCost,
		&shipment.AcceptanceDate,
		&shipment.PositionsQty,
		&shipment.SentQty,
		&shipment.AcceptedQty,
		&shipment.CreatedBy,
		&shipment.CreatedAt,
		&shipment.UpdatedBy,
		&shipment.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMpShipmentNotFound
		}
		return nil, err
	}

	return &shipment, nil
}

func (r *MpShipmentRepository) List(ctx context.Context, limit, offset int, storeID, warehouseID, statusID *uuid.UUID) ([]MpShipment, error) {
	query := `
		SELECT shipment_id, shipment_date, shipment_number, store_id, main_warehouse_id, mp_warehouse_id,
		       status_id, logistics_cost, acceptance_cost,
		       acceptance_date, positions_qty, sent_qty, accepted_qty,
		       created_by, created_at, updated_by, updated_at
		FROM mp_shipments
	`
	args := []any{}
	argPos := 1
	conditions := []string{}

	if storeID != nil {
		conditions = append(conditions, fmt.Sprintf("store_id = $%d", argPos))
		args = append(args, *storeID)
		argPos++
	}
	// Backward-compatible filter: "warehouseID" filters by mp_warehouse_id (destination).
	if warehouseID != nil {
		conditions = append(conditions, fmt.Sprintf("mp_warehouse_id = $%d", argPos))
		args = append(args, *warehouseID)
		argPos++
	}
	if statusID != nil {
		conditions = append(conditions, fmt.Sprintf("status_id = $%d", argPos))
		args = append(args, *statusID)
		argPos++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += fmt.Sprintf(` ORDER BY shipment_id DESC LIMIT $%d OFFSET $%d`, argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []MpShipment
	for rows.Next() {
		var shipment MpShipment
		if err := rows.Scan(
			&shipment.ShipmentID,
			&shipment.ShipmentDate,
			&shipment.ShipmentNumber,
			&shipment.StoreID,
			&shipment.MainWarehouseID,
			&shipment.MpWarehouseID,
			&shipment.StatusID,
			&shipment.LogisticsCost,
			&shipment.AcceptanceCost,
			&shipment.AcceptanceDate,
			&shipment.PositionsQty,
			&shipment.SentQty,
			&shipment.AcceptedQty,
			&shipment.CreatedBy,
			&shipment.CreatedAt,
			&shipment.UpdatedBy,
			&shipment.UpdatedAt,
		); err != nil {
			return nil, err
		}
		shipments = append(shipments, shipment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return shipments, nil
}

func (r *MpShipmentRepository) Create(ctx context.Context, shipmentDate *time.Time, shipmentNumber string, storeID, mainWarehouseID, mpWarehouseID, statusID *uuid.UUID, logisticsCost, acceptanceCost *float64, acceptanceDate *time.Time, positionsQty, sentQty, acceptedQty int, createdBy *uuid.UUID) (*MpShipment, error) {
	query := `
		INSERT INTO mp_shipments (
			shipment_date, shipment_number, store_id, main_warehouse_id, mp_warehouse_id, status_id,
			logistics_cost, acceptance_cost, acceptance_date,
			positions_qty, sent_qty, accepted_qty, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING shipment_id, shipment_date, shipment_number, store_id, main_warehouse_id, mp_warehouse_id,
		          status_id, logistics_cost, acceptance_cost,
		          acceptance_date, positions_qty, sent_qty, accepted_qty,
		          created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var shipment MpShipment
	err := r.pool.QueryRow(ctx, query,
		shipmentDate, shipmentNumber, storeID, mainWarehouseID, mpWarehouseID, statusID,
		logisticsCost, acceptanceCost, acceptanceDate,
		positionsQty, sentQty, acceptedQty, createdBy,
	).Scan(
		&shipment.ShipmentID,
		&shipment.ShipmentDate,
		&shipment.ShipmentNumber,
		&shipment.StoreID,
		&shipment.MainWarehouseID,
		&shipment.MpWarehouseID,
		&shipment.StatusID,
		&shipment.LogisticsCost,
		&shipment.AcceptanceCost,
		&shipment.AcceptanceDate,
		&shipment.PositionsQty,
		&shipment.SentQty,
		&shipment.AcceptedQty,
		&shipment.CreatedBy,
		&shipment.CreatedAt,
		&shipment.UpdatedBy,
		&shipment.UpdatedAt,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "mp_shipments_shipment_number_key") {
			return nil, ErrMpShipmentExists
		}
		return nil, err
	}

	return &shipment, nil
}

func (r *MpShipmentRepository) Update(ctx context.Context, shipmentID uuid.UUID, shipmentDate *time.Time, shipmentNumber string, storeID, mainWarehouseID, mpWarehouseID, statusID *uuid.UUID, logisticsCost, acceptanceCost *float64, acceptanceDate *time.Time, positionsQty, sentQty, acceptedQty int, updatedBy *uuid.UUID) (*MpShipment, error) {
	query := `
		UPDATE mp_shipments
		SET shipment_date = $1, shipment_number = $2, store_id = $3,
		    main_warehouse_id = $4, mp_warehouse_id = $5,
		    status_id = $6, logistics_cost = $7,
		    acceptance_cost = $8, acceptance_date = $9, positions_qty = $10,
		    sent_qty = $11, accepted_qty = $12, updated_by = $13,
		    updated_at = CURRENT_TIMESTAMP
		WHERE shipment_id = $14
		RETURNING shipment_id, shipment_date, shipment_number, store_id, main_warehouse_id, mp_warehouse_id,
		          status_id, logistics_cost, acceptance_cost,
		          acceptance_date, positions_qty, sent_qty, accepted_qty,
		          created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var shipment MpShipment
	err := r.pool.QueryRow(ctx, query,
		shipmentDate, shipmentNumber, storeID, mainWarehouseID, mpWarehouseID, statusID,
		logisticsCost, acceptanceCost, acceptanceDate,
		positionsQty, sentQty, acceptedQty, updatedBy, shipmentID,
	).Scan(
		&shipment.ShipmentID,
		&shipment.ShipmentDate,
		&shipment.ShipmentNumber,
		&shipment.StoreID,
		&shipment.MainWarehouseID,
		&shipment.MpWarehouseID,
		&shipment.StatusID,
		&shipment.LogisticsCost,
		&shipment.AcceptanceCost,
		&shipment.AcceptanceDate,
		&shipment.PositionsQty,
		&shipment.SentQty,
		&shipment.AcceptedQty,
		&shipment.CreatedBy,
		&shipment.CreatedAt,
		&shipment.UpdatedBy,
		&shipment.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMpShipmentNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrMpShipmentExists
		}
		return nil, err
	}

	return &shipment, nil
}

// UpdateAggregates updates only derived aggregate fields of the shipment.
func (r *MpShipmentRepository) UpdateAggregates(ctx context.Context, shipmentID uuid.UUID, positionsQty, sentQty, acceptedQty int, updatedBy *uuid.UUID) error {
	query := `
		UPDATE mp_shipments
		SET positions_qty = $1,
		    sent_qty = $2,
		    accepted_qty = $3,
		    updated_by = $4,
		    updated_at = CURRENT_TIMESTAMP
		WHERE shipment_id = $5
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, positionsQty, sentQty, acceptedQty, updatedBy, shipmentID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrMpShipmentNotFound
	}
	return nil
}

func (r *MpShipmentRepository) Delete(ctx context.Context, shipmentID uuid.UUID) error {
	query := `
		DELETE FROM mp_shipments
		WHERE shipment_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, shipmentID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMpShipmentNotFound
	}

	return nil
}
