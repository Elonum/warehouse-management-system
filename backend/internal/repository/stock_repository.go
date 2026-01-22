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
