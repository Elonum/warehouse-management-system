package repository

import (
	"context"
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
) ([]StockItem, error) {

	query := `
		SELECT productid, warehouseid, currentquantity
		FROM vw_current_stock
	`

	args := []any{}
	if warehouseID != nil {
		query += ` WHERE warehouseid = $1`
		args = append(args, *warehouseID)
	}

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

	return result, nil
}
