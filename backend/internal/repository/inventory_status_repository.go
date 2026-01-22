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
	ErrInventoryStatusNotFound = errors.New("inventory status not found")
	ErrInventoryStatusExists   = errors.New("inventory status already exists")
)

type InventoryStatus struct {
	InventoryStatusID uuid.UUID
	Name              string
}

type InventoryStatusRepository struct {
	pool *pgxpool.Pool
}

func NewInventoryStatusRepository(pool *pgxpool.Pool) *InventoryStatusRepository {
	return &InventoryStatusRepository{pool: pool}
}

func (r *InventoryStatusRepository) GetByID(ctx context.Context, statusID uuid.UUID) (*InventoryStatus, error) {
	query := `
		SELECT inventory_status_id, name
		FROM inventory_statuses
		WHERE inventory_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status InventoryStatus
	err := r.pool.QueryRow(ctx, query, statusID).Scan(
		&status.InventoryStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryStatusNotFound
		}
		return nil, err
	}

	return &status, nil
}

func (r *InventoryStatusRepository) List(ctx context.Context, limit, offset int) ([]InventoryStatus, error) {
	query := fmt.Sprintf(`
		SELECT inventory_status_id, name
		FROM inventory_statuses
		ORDER BY inventory_status_id
		LIMIT $1 OFFSET $2
	`)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []InventoryStatus
	for rows.Next() {
		var status InventoryStatus
		if err := rows.Scan(
			&status.InventoryStatusID,
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

func (r *InventoryStatusRepository) Create(ctx context.Context, name string) (*InventoryStatus, error) {
	query := `
		INSERT INTO inventory_statuses (name)
		VALUES ($1)
		RETURNING inventory_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status InventoryStatus
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&status.InventoryStatusID,
		&status.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "inventory_statuses_name_key") {
			return nil, ErrInventoryStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *InventoryStatusRepository) Update(ctx context.Context, statusID uuid.UUID, name string) (*InventoryStatus, error) {
	query := `
		UPDATE inventory_statuses
		SET name = $1
		WHERE inventory_status_id = $2
		RETURNING inventory_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status InventoryStatus
	err := r.pool.QueryRow(ctx, query, name, statusID).Scan(
		&status.InventoryStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryStatusNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *InventoryStatusRepository) Delete(ctx context.Context, statusID uuid.UUID) error {
	query := `
		DELETE FROM inventory_statuses
		WHERE inventory_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, statusID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrInventoryStatusNotFound
	}

	return nil
}
