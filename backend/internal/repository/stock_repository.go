package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StockItem struct {
	ProductID       int
	WarehouseID     int
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
	warehouseID *int,
	limit int,
	offset int,
) ([]StockItem, error) {

	// Используем кавычки для camelCase имен полей из view
	query := `
		SELECT "productId", "warehouseId", "currentQuantity"
		FROM vw_current_stock
	`

	args := []any{}
	argPos := 1

	if warehouseID != nil {
		query += ` WHERE "warehouseId" = $1`
		args = append(args, *warehouseID)
		argPos++
	}

	query += fmt.Sprintf(` ORDER BY "productId" LIMIT $%d OFFSET $%d`, argPos, argPos+1)
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

	// Проверяем ошибки после итерации (важно для выявления проблем с чтением данных)
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
