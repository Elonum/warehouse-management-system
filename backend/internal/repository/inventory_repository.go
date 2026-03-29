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
	ErrInventoryNotFound = errors.New("inventory not found")
	ErrInventoryExists   = errors.New("inventory already exists")
)

type Inventory struct {
	InventoryID      uuid.UUID
	AdjustmentDate   *time.Time
	StatusID         uuid.UUID
	Notes            *string
	CreatedBy        uuid.UUID
	CreatedAt        time.Time
	UpdatedBy        *uuid.UUID
	UpdatedAt        time.Time
	TotalReceiptQty  int // Pre-aggregated from inventory_items
	TotalWriteOffQty int // Pre-aggregated from inventory_items
}

type InventoryRepository struct {
	pool *pgxpool.Pool
}

func NewInventoryRepository(pool *pgxpool.Pool) *InventoryRepository {
	return &InventoryRepository{pool: pool}
}

func (r *InventoryRepository) GetByID(ctx context.Context, inventoryID uuid.UUID) (*Inventory, error) {
	// Optimized query with pre-aggregated totals
	query := `
		SELECT 
			i.inventory_id,
			i.adjustment_date,
			i.status_id,
			i.notes,
			i.created_by,
			i.created_at,
			i.updated_by,
			i.updated_at,
			COALESCE(SUM(ii.receipt_qty), 0) AS total_receipt_qty,
			COALESCE(SUM(ii.write_off_qty), 0) AS total_write_off_qty
		FROM inventories i
		LEFT JOIN inventory_items ii ON ii.inventory_id = i.inventory_id
		WHERE i.inventory_id = $1
		GROUP BY i.inventory_id, i.adjustment_date, i.status_id, i.notes, i.created_by, i.created_at, i.updated_by, i.updated_at
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
		&inventory.TotalReceiptQty,
		&inventory.TotalWriteOffQty,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryNotFound
		}
		return nil, err
	}

	return &inventory, nil
}

func (r *InventoryRepository) List(ctx context.Context, limit, offset int, statusID *uuid.UUID) ([]Inventory, error) {
	// Optimized query with pre-aggregated totals to avoid N+1 queries
	query := `
		SELECT 
			i.inventory_id,
			i.adjustment_date,
			i.status_id,
			i.notes,
			i.created_by,
			i.created_at,
			i.updated_by,
			i.updated_at,
			COALESCE(SUM(ii.receipt_qty), 0) AS total_receipt_qty,
			COALESCE(SUM(ii.write_off_qty), 0) AS total_write_off_qty
		FROM inventories i
		LEFT JOIN inventory_items ii ON ii.inventory_id = i.inventory_id
	`
	args := []interface{}{}
	argPos := 1

	if statusID != nil {
		query += fmt.Sprintf(" WHERE i.status_id = $%d", argPos)
		args = append(args, *statusID)
		argPos++
	}

	query += " GROUP BY i.inventory_id, i.adjustment_date, i.status_id, i.notes, i.created_by, i.created_at, i.updated_by, i.updated_at"
	query += fmt.Sprintf(" ORDER BY i.adjustment_date DESC NULLS LAST, i.inventory_id DESC LIMIT $%d OFFSET $%d", argPos, argPos+1)
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
		var totalReceiptQty, totalWriteOffQty int
		if err := rows.Scan(
			&inventory.InventoryID,
			&inventory.AdjustmentDate,
			&inventory.StatusID,
			&inventory.Notes,
			&inventory.CreatedBy,
			&inventory.CreatedAt,
			&inventory.UpdatedBy,
			&inventory.UpdatedAt,
			&totalReceiptQty,
			&totalWriteOffQty,
		); err != nil {
			return nil, err
		}
		inventory.TotalReceiptQty = totalReceiptQty
		inventory.TotalWriteOffQty = totalWriteOffQty
		inventories = append(inventories, inventory)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return inventories, nil
}

func (r *InventoryRepository) Create(ctx context.Context, adjustmentDate *time.Time, statusID uuid.UUID, notes *string, createdBy *uuid.UUID) (*Inventory, error) {
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

	// Initialize totals to zero for new inventory (no items yet)
	inventory.TotalReceiptQty = 0
	inventory.TotalWriteOffQty = 0

	return &inventory, nil
}

func (r *InventoryRepository) Update(ctx context.Context, inventoryID uuid.UUID, adjustmentDate *time.Time, statusID uuid.UUID, notes *string, updatedBy *uuid.UUID) (*Inventory, error) {
	// First update the inventory
	updateQuery := `
		UPDATE inventories
		SET adjustment_date = $1, status_id = $2, notes = $3, updated_by = $4, updated_at = NOW()
		WHERE inventory_id = $5
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, updateQuery, adjustmentDate, statusID, notes, updatedBy, inventoryID)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryExists
		}
		return nil, err
	}

	if result.RowsAffected() == 0 {
		return nil, ErrInventoryNotFound
	}

	// Then fetch with aggregated totals
	return r.GetByID(ctx, inventoryID)
}

func (r *InventoryRepository) Delete(ctx context.Context, inventoryID uuid.UUID) error {
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
