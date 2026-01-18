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
	ErrStockSnapshotNotFound = errors.New("stock snapshot not found")
	ErrStockSnapshotExists   = errors.New("stock snapshot already exists")
)

type StockSnapshot struct {
	SnapshotID   int
	ProductID    int
	WarehouseID  int
	SnapshotDate time.Time
	Quantity     int
	CreatedBy    *int
	CreatedAt    time.Time
}

type StockSnapshotRepository struct {
	pool *pgxpool.Pool
}

func NewStockSnapshotRepository(pool *pgxpool.Pool) *StockSnapshotRepository {
	return &StockSnapshotRepository{pool: pool}
}

func (r *StockSnapshotRepository) GetByID(ctx context.Context, snapshotID int) (*StockSnapshot, error) {
	query := `
		SELECT snapshot_id, product_id, warehouse_id, snapshot_date, quantity, created_by, created_at
		FROM stock_snapshots
		WHERE snapshot_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var snapshot StockSnapshot
	err := r.pool.QueryRow(ctx, query, snapshotID).Scan(
		&snapshot.SnapshotID,
		&snapshot.ProductID,
		&snapshot.WarehouseID,
		&snapshot.SnapshotDate,
		&snapshot.Quantity,
		&snapshot.CreatedBy,
		&snapshot.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStockSnapshotNotFound
		}
		return nil, err
	}

	return &snapshot, nil
}

func (r *StockSnapshotRepository) List(ctx context.Context, limit, offset int, warehouseID, productID *int) ([]StockSnapshot, error) {
	query := `
		SELECT snapshot_id, product_id, warehouse_id, snapshot_date, quantity, created_by, created_at
		FROM stock_snapshots
	`
	args := []interface{}{}
	argPos := 1

	if warehouseID != nil {
		query += fmt.Sprintf(" WHERE warehouse_id = $%d", argPos)
		args = append(args, *warehouseID)
		argPos++
		if productID != nil {
			query += fmt.Sprintf(" AND product_id = $%d", argPos)
			args = append(args, *productID)
			argPos++
		}
	} else if productID != nil {
		query += fmt.Sprintf(" WHERE product_id = $%d", argPos)
		args = append(args, *productID)
		argPos++
	}

	query += fmt.Sprintf(" ORDER BY snapshot_id LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []StockSnapshot
	for rows.Next() {
		var snapshot StockSnapshot
		if err := rows.Scan(
			&snapshot.SnapshotID,
			&snapshot.ProductID,
			&snapshot.WarehouseID,
			&snapshot.SnapshotDate,
			&snapshot.Quantity,
			&snapshot.CreatedBy,
			&snapshot.CreatedAt,
		); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, snapshot)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return snapshots, nil
}

func (r *StockSnapshotRepository) Create(ctx context.Context, productID, warehouseID int, snapshotDate time.Time, quantity int, createdBy *int) (*StockSnapshot, error) {
	query := `
		INSERT INTO stock_snapshots (product_id, warehouse_id, snapshot_date, quantity, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING snapshot_id, product_id, warehouse_id, snapshot_date, quantity, created_by, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var snapshot StockSnapshot
	err := r.pool.QueryRow(ctx, query, productID, warehouseID, snapshotDate, quantity, createdBy).Scan(
		&snapshot.SnapshotID,
		&snapshot.ProductID,
		&snapshot.WarehouseID,
		&snapshot.SnapshotDate,
		&snapshot.Quantity,
		&snapshot.CreatedBy,
		&snapshot.CreatedAt,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrStockSnapshotExists
		}
		return nil, err
	}

	return &snapshot, nil
}

func (r *StockSnapshotRepository) Update(ctx context.Context, snapshotID int, productID, warehouseID int, snapshotDate time.Time, quantity int) (*StockSnapshot, error) {
	query := `
		UPDATE stock_snapshots
		SET product_id = $1, warehouse_id = $2, snapshot_date = $3, quantity = $4
		WHERE snapshot_id = $5
		RETURNING snapshot_id, product_id, warehouse_id, snapshot_date, quantity, created_by, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var snapshot StockSnapshot
	err := r.pool.QueryRow(ctx, query, productID, warehouseID, snapshotDate, quantity, snapshotID).Scan(
		&snapshot.SnapshotID,
		&snapshot.ProductID,
		&snapshot.WarehouseID,
		&snapshot.SnapshotDate,
		&snapshot.Quantity,
		&snapshot.CreatedBy,
		&snapshot.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStockSnapshotNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrStockSnapshotExists
		}
		return nil, err
	}

	return &snapshot, nil
}

func (r *StockSnapshotRepository) Delete(ctx context.Context, snapshotID int) error {
	query := `
		DELETE FROM stock_snapshots
		WHERE snapshot_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, snapshotID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrStockSnapshotNotFound
	}

	return nil
}
