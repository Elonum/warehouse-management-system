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
}

type StockRepository struct {
	pool *pgxpool.Pool
}

func NewStockRepository(pool *pgxpool.Pool) *StockRepository {
	return &StockRepository{pool: pool}
}

func (r *StockRepository) GetCurrentStock(
	ctx context.Context,
	warehouseID *uuid.UUID,
	limit int,
	offset int,
) ([]StockItem, error) {

	query := `
		SELECT product_id, warehouse_id, current_quantity
		FROM vw_current_stock
	`

	args := []any{}
	argPos := 1

	if warehouseID != nil {
		query += ` WHERE warehouse_id = $1`
		args = append(args, *warehouseID)
		argPos++
	}

	query += fmt.Sprintf(` ORDER BY product_id LIMIT $%d OFFSET $%d`, argPos, argPos+1)
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
