package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInventoryItemNotFound = errors.New("inventory item not found")
	ErrInventoryItemExists   = errors.New("inventory item already exists")
)

type InventoryItem struct {
	InventoryItemID int
	InventoryID     int
	ProductID       *int
	WarehouseID     int
	ReceiptQty      int
	WriteOffQty     int
	Reason          *string
}

type InventoryItemRepository struct {
	pool *pgxpool.Pool
}

func NewInventoryItemRepository(pool *pgxpool.Pool) *InventoryItemRepository {
	return &InventoryItemRepository{pool: pool}
}

func (r *InventoryItemRepository) GetByID(ctx context.Context, itemID int) (*InventoryItem, error) {
	query := `
		SELECT inventory_item_id, inventory_id, product_id, warehouse_id, receipt_qty, write_off_qty, reason
		FROM inventory_items
		WHERE inventory_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item InventoryItem
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&item.InventoryItemID,
		&item.InventoryID,
		&item.ProductID,
		&item.WarehouseID,
		&item.ReceiptQty,
		&item.WriteOffQty,
		&item.Reason,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryItemNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *InventoryItemRepository) GetByInventoryID(ctx context.Context, inventoryID int) ([]InventoryItem, error) {
	query := `
		SELECT inventory_item_id, inventory_id, product_id, warehouse_id, receipt_qty, write_off_qty, reason
		FROM inventory_items
		WHERE inventory_id = $1
		ORDER BY inventory_item_id
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, inventoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []InventoryItem
	for rows.Next() {
		var item InventoryItem
		if err := rows.Scan(
			&item.InventoryItemID,
			&item.InventoryID,
			&item.ProductID,
			&item.WarehouseID,
			&item.ReceiptQty,
			&item.WriteOffQty,
			&item.Reason,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (r *InventoryItemRepository) Create(ctx context.Context, inventoryID int, productID *int, warehouseID int, receiptQty, writeOffQty int, reason *string) (*InventoryItem, error) {
	query := `
		INSERT INTO inventory_items (inventory_id, product_id, warehouse_id, receipt_qty, write_off_qty, reason)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING inventory_item_id, inventory_id, product_id, warehouse_id, receipt_qty, write_off_qty, reason
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item InventoryItem
	err := r.pool.QueryRow(ctx, query, inventoryID, productID, warehouseID, receiptQty, writeOffQty, reason).Scan(
		&item.InventoryItemID,
		&item.InventoryID,
		&item.ProductID,
		&item.WarehouseID,
		&item.ReceiptQty,
		&item.WriteOffQty,
		&item.Reason,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryItemExists
		}
		return nil, err
	}

	return &item, nil
}

func (r *InventoryItemRepository) Update(ctx context.Context, itemID int, inventoryID int, productID *int, warehouseID int, receiptQty, writeOffQty int, reason *string) (*InventoryItem, error) {
	query := `
		UPDATE inventory_items
		SET inventory_id = $1, product_id = $2, warehouse_id = $3, receipt_qty = $4, write_off_qty = $5, reason = $6
		WHERE inventory_item_id = $7
		RETURNING inventory_item_id, inventory_id, product_id, warehouse_id, receipt_qty, write_off_qty, reason
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item InventoryItem
	err := r.pool.QueryRow(ctx, query, inventoryID, productID, warehouseID, receiptQty, writeOffQty, reason, itemID).Scan(
		&item.InventoryItemID,
		&item.InventoryID,
		&item.ProductID,
		&item.WarehouseID,
		&item.ReceiptQty,
		&item.WriteOffQty,
		&item.Reason,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInventoryItemNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrInventoryItemExists
		}
		return nil, err
	}

	return &item, nil
}

func (r *InventoryItemRepository) Delete(ctx context.Context, itemID int) error {
	query := `
		DELETE FROM inventory_items
		WHERE inventory_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, itemID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrInventoryItemNotFound
	}

	return nil
}

func (r *InventoryItemRepository) DeleteByInventoryID(ctx context.Context, inventoryID int) error {
	query := `
		DELETE FROM inventory_items
		WHERE inventory_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, inventoryID)
	return err
}
