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
	ErrInventoryNotFound = errors.New("inventory not found")
	ErrInventoryExists   = errors.New("inventory already exists")
)

type Inventory struct {
	InventoryID    int
	AdjustmentDate *time.Time
	StatusID       int
	Notes          *string
	CreatedBy      int
	CreatedAt      time.Time
	UpdatedBy      *int
	UpdatedAt      time.Time
}

type InventoryRepository struct {
	pool *pgxpool.Pool
}

func NewInventoryRepository(pool *pgxpool.Pool) *InventoryRepository {
	return &InventoryRepository{pool: pool}
}

func (r *InventoryRepository) GetByID(ctx context.Context, inventoryID int) (*Inventory, error) {
	query := `
		SELECT inventory_id, adjustment_date, status_id, notes, created_by, created_at, updated_by, updated_at
		FROM inventories
		WHERE inventory_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var inventory Inventory
	err := r.pool.QueryRow(ctx, query, inventoryID).Scan(
		&inventory.InventoryID,
		&inventory.AdjustmentDate,
		&inventory.StatusID,
		&inventory.Notes,
		&inventory.CreatedBy,
		&inventory.CreatedAt,
		&inventory.UpdatedBy,
		&inventory.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryNotFound
		}
		return nil, err
	}

	return &inventory, nil
}

func (r *InventoryRepository) List(ctx context.Context, limit, offset int, statusID *int) ([]Inventory, error) {
	query := `
		SELECT inventory_id, adjustment_date, status_id, notes, created_by, created_at, updated_by, updated_at
		FROM inventories
	`
	args := []interface{}{}
	argPos := 1

	if statusID != nil {
		query += fmt.Sprintf(" WHERE status_id = $%d", argPos)
		args = append(args, *statusID)
		argPos++
	}

	query += fmt.Sprintf(" ORDER BY inventory_id LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var inventories []Inventory
	for rows.Next() {
		var inventory Inventory
		if err := rows.Scan(
			&inventory.InventoryID,
			&inventory.AdjustmentDate,
			&inventory.StatusID,
			&inventory.Notes,
			&inventory.CreatedBy,
			&inventory.CreatedAt,
			&inventory.UpdatedBy,
			&inventory.UpdatedAt,
		); err != nil {
			return nil, err
		}
		inventories = append(inventories, inventory)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return inventories, nil
}

func (r *InventoryRepository) Create(ctx context.Context, adjustmentDate *time.Time, statusID int, notes *string, createdBy *int) (*Inventory, error) {
	query := `
		INSERT INTO inventories (adjustment_date, status_id, notes, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING inventory_id, adjustment_date, status_id, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var inventory Inventory
	err := r.pool.QueryRow(ctx, query, adjustmentDate, statusID, notes, createdBy).Scan(
		&inventory.InventoryID,
		&inventory.AdjustmentDate,
		&inventory.StatusID,
		&inventory.Notes,
		&inventory.CreatedBy,
		&inventory.CreatedAt,
		&inventory.UpdatedBy,
		&inventory.UpdatedAt,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryExists
		}
		return nil, err
	}

	return &inventory, nil
}

func (r *InventoryRepository) Update(ctx context.Context, inventoryID int, adjustmentDate *time.Time, statusID int, notes *string, updatedBy *int) (*Inventory, error) {
	query := `
		UPDATE inventories
		SET adjustment_date = $1, status_id = $2, notes = $3, updated_by = $4, updated_at = NOW()
		WHERE inventory_id = $5
		RETURNING inventory_id, adjustment_date, status_id, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var inventory Inventory
	err := r.pool.QueryRow(ctx, query, adjustmentDate, statusID, notes, updatedBy, inventoryID).Scan(
		&inventory.InventoryID,
		&inventory.AdjustmentDate,
		&inventory.StatusID,
		&inventory.Notes,
		&inventory.CreatedBy,
		&inventory.CreatedAt,
		&inventory.UpdatedBy,
		&inventory.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryExists
		}
		return nil, err
	}

	return &inventory, nil
}

func (r *InventoryRepository) Delete(ctx context.Context, inventoryID int) error {
	query := `
		DELETE FROM inventories
		WHERE inventory_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, inventoryID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrInventoryNotFound
	}

	return nil
}
