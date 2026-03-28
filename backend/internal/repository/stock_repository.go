package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StockItem struct {
	ProductID       uuid.UUID
	WarehouseID     uuid.UUID
	CurrentQuantity int
	ReorderPoint    int
}

type StockRepository struct {
	pool *pgxpool.Pool
}

type StockLevelFilter string

const (
	StockLevelFilterAll          StockLevelFilter = "all"
	StockLevelFilterPositive     StockLevelFilter = "positive"
	StockLevelFilterZero         StockLevelFilter = "zero"
	StockLevelFilterBelowReorder StockLevelFilter = "below_reorder"
)

func NewStockRepository(pool *pgxpool.Pool) *StockRepository {
	return &StockRepository{pool: pool}
}

func stockCurrentWhereAndArgs(
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	levelFilter StockLevelFilter,
) (where string, args []any, nextArg int) {
	args = []any{}
	n := 1
	where = " WHERE 1=1"
	if warehouseID != nil {
		where += fmt.Sprintf(" AND cs.warehouse_id = $%d", n)
		args = append(args, *warehouseID)
		n++
	}
	if productID != nil {
		where += fmt.Sprintf(" AND cs.product_id = $%d", n)
		args = append(args, *productID)
		n++
	}
	if q != nil && *q != "" {
		where += fmt.Sprintf(" AND (p.article ILIKE $%d OR p.barcode ILIKE $%d)", n, n)
		args = append(args, "%"+*q+"%")
		n++
	}
	switch levelFilter {
	case StockLevelFilterPositive:
		where += " AND cs.current_quantity > 0"
	case StockLevelFilterZero:
		where += " AND cs.current_quantity = 0"
	case StockLevelFilterBelowReorder:
		where += " AND cs.current_quantity <= p.reorder_point"
	}
	return where, args, n
}

func stockCurrentOrderBy(levelFilter StockLevelFilter) string {
	switch levelFilter {
	case StockLevelFilterBelowReorder:
		return " ORDER BY cs.current_quantity ASC, p.article ASC, cs.product_id ASC"
	default:
		return " ORDER BY p.article ASC, cs.product_id ASC"
	}
}

const stockCurrentFrom = `
		SELECT cs.product_id, cs.warehouse_id, cs.current_quantity, p.reorder_point
		FROM vw_current_stock cs
		JOIN products p ON p.product_id = cs.product_id`

func (r *StockRepository) CountCurrentStock(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	levelFilter StockLevelFilter,
) (int64, error) {
	where, args, _ := stockCurrentWhereAndArgs(warehouseID, productID, q, levelFilter)
	query := `SELECT COUNT(*)::bigint FROM vw_current_stock cs JOIN products p ON p.product_id = cs.product_id` + where

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var n int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&n)
	if err != nil {
		return 0, err
	}
	return n, nil
}

func (r *StockRepository) GetCurrentStock(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	levelFilter StockLevelFilter,
	limit int,
	offset int,
) ([]StockItem, error) {

	where, args, argPos := stockCurrentWhereAndArgs(warehouseID, productID, q, levelFilter)
	query := stockCurrentFrom + where + stockCurrentOrderBy(levelFilter)
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []StockItem
	for rows.Next() {
		var item StockItem
		if err := rows.Scan(
			&item.ProductID,
			&item.WarehouseID,
			&item.CurrentQuantity,
			&item.ReorderPoint,
		); err != nil {
			return nil, err
		}
		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *StockRepository) UpdateStockByInventoryItem(ctx context.Context, productID *uuid.UUID, warehouseID uuid.UUID, adjustmentDate *time.Time, createdBy *uuid.UUID) error {
	if productID == nil || adjustmentDate == nil {
		return nil
	}

	query := `
		INSERT INTO stock_snapshots (product_id, warehouse_id, snapshot_date, quantity, created_by)
		VALUES ($1, $2, $3, 
			COALESCE(
				(SELECT quantity FROM stock_snapshots 
				 WHERE product_id = $1 AND warehouse_id = $2 
				 ORDER BY snapshot_date DESC LIMIT 1),
				0
			),
			$4
		)
		ON CONFLICT (product_id, warehouse_id, snapshot_date)
		DO NOTHING
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, *productID, warehouseID, adjustmentDate, createdBy)
	return err
}

func (r *StockRepository) RevertStockByInventoryItem(ctx context.Context, productID *uuid.UUID, warehouseID uuid.UUID, adjustmentDate *time.Time) error {
	return nil
}

// ApplyReceiptFromSupplierOrder applies a positive stock delta for all goods received from a supplier order.
// It creates or updates a stock snapshot for the given date, adding the received quantity to the latest known
// quantity for that product and warehouse.
// This operation is idempotent: multiple calls with the same parameters will add quantities multiple times.
// Validation: receivedQty must be positive; negative or zero values are ignored.
func (r *StockRepository) ApplyReceiptFromSupplierOrder(
	ctx context.Context,
	productID, warehouseID uuid.UUID,
	receiptDate time.Time,
	receivedQty int,
	createdBy *uuid.UUID,
) error {
	if receivedQty <= 0 {
		return nil
	}

	query := `
		INSERT INTO stock_snapshots (product_id, warehouse_id, snapshot_date, quantity, created_by)
		VALUES (
			$1,
			$2,
			$3,
			COALESCE(
				(SELECT quantity FROM stock_snapshots 
				 WHERE product_id = $1 AND warehouse_id = $2 
				 ORDER BY snapshot_date DESC LIMIT 1),
				0
			) + $4,
			$5
		)
		ON CONFLICT (product_id, warehouse_id, snapshot_date)
		DO UPDATE SET quantity = stock_snapshots.quantity + EXCLUDED.quantity
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, productID, warehouseID, receiptDate, receivedQty, createdBy)
	return err
}

// ApplyShipmentOutFromMpShipment applies a negative stock delta for all goods accepted from an mp shipment.
// It writes the delta into stock_snapshots at the given acceptanceDate, grouped by product and warehouse.
// acceptedQty must be positive; non-positive values are ignored.
func (r *StockRepository) ApplyShipmentOutFromMpShipment(
	ctx context.Context,
	productID, warehouseID uuid.UUID,
	acceptanceDate time.Time,
	acceptedQty int,
	createdBy *uuid.UUID,
) error {
	if acceptedQty <= 0 {
		return nil
	}

	query := `
		INSERT INTO stock_snapshots (product_id, warehouse_id, snapshot_date, quantity, created_by)
		VALUES (
			$1,
			$2,
			$3,
			COALESCE(
				(SELECT quantity FROM stock_snapshots
				 WHERE product_id = $1 AND warehouse_id = $2
				 ORDER BY snapshot_date DESC LIMIT 1),
				0
			) - $4,
			$5
		)
		ON CONFLICT (product_id, warehouse_id, snapshot_date)
		DO UPDATE SET quantity = stock_snapshots.quantity - $4
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, productID, warehouseID, acceptanceDate, acceptedQty, createdBy)
	return err
}
