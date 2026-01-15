package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrShipmentStatusNotFound = errors.New("shipment status not found")
	ErrShipmentStatusExists   = errors.New("shipment status already exists")
)

type ShipmentStatus struct {
	ShipmentStatusID int
	Name             string
}

type ShipmentStatusRepository struct {
	pool *pgxpool.Pool
}

func NewShipmentStatusRepository(pool *pgxpool.Pool) *ShipmentStatusRepository {
	return &ShipmentStatusRepository{pool: pool}
}

func (r *ShipmentStatusRepository) GetByID(ctx context.Context, statusID int) (*ShipmentStatus, error) {
	query := `
		SELECT shipment_status_id, name
		FROM shipment_statuses
		WHERE shipment_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status ShipmentStatus
	err := r.pool.QueryRow(ctx, query, statusID).Scan(
		&status.ShipmentStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrShipmentStatusNotFound
		}
		return nil, err
	}

	return &status, nil
}

func (r *ShipmentStatusRepository) List(ctx context.Context, limit, offset int) ([]ShipmentStatus, error) {
	query := fmt.Sprintf(`
		SELECT shipment_status_id, name
		FROM shipment_statuses
		ORDER BY shipment_status_id
		LIMIT $1 OFFSET $2
	`)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []ShipmentStatus
	for rows.Next() {
		var status ShipmentStatus
		if err := rows.Scan(
			&status.ShipmentStatusID,
			&status.Name,
		); err != nil {
			return nil, err
		}
		statuses = append(statuses, status)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return statuses, nil
}

func (r *ShipmentStatusRepository) Create(ctx context.Context, name string) (*ShipmentStatus, error) {
	query := `
		INSERT INTO shipment_statuses (name)
		VALUES ($1)
		RETURNING shipment_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status ShipmentStatus
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&status.ShipmentStatusID,
		&status.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "shipment_statuses_name_key") {
			return nil, ErrShipmentStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *ShipmentStatusRepository) Update(ctx context.Context, statusID int, name string) (*ShipmentStatus, error) {
	query := `
		UPDATE shipment_statuses
		SET name = $1
		WHERE shipment_status_id = $2
		RETURNING shipment_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status ShipmentStatus
	err := r.pool.QueryRow(ctx, query, name, statusID).Scan(
		&status.ShipmentStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrShipmentStatusNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrShipmentStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *ShipmentStatusRepository) Delete(ctx context.Context, statusID int) error {
	query := `
		DELETE FROM shipment_statuses
		WHERE shipment_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, statusID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrShipmentStatusNotFound
	}

	return nil
}
