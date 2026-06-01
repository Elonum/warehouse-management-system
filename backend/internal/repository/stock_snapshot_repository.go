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
	ErrStockSnapshotNotFound = errors.New("stock snapshot not found")
	ErrStockSnapshotExists   = errors.New("stock snapshot already exists")
)

type StockSnapshot struct {
	SnapshotID   uuid.UUID
	ProductID    uuid.UUID
	WarehouseID  uuid.UUID
	SnapshotDate time.Time
	Quantity     int
	CreatedBy    *uuid.UUID
	CreatedAt    time.Time
}

type StockSnapshotRepository struct {
	pool *pgxpool.Pool
}

func NewStockSnapshotRepository(pool *pgxpool.Pool) *StockSnapshotRepository {
	return &StockSnapshotRepository{pool: pool}
}

func (r *StockSnapshotRepository) GetByID(ctx context.Context, snapshotID uuid.UUID) (*StockSnapshot, error) {
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

type StockSnapshotListRow struct {
	SnapshotID      uuid.UUID
	ProductID       uuid.UUID
	ProductArticle  string
	ProductBarcode  string
	WarehouseID     uuid.UUID
	WarehouseName   string
	IsMarketplaceWH bool
	SnapshotDate    time.Time
	Quantity        int
	IsLatestForPair bool
	CreatedBy       *uuid.UUID
	CreatedAt       time.Time
}

type StockSnapshotSummary struct {
	TotalRows    int64
	UniquePairs  int64
	EarliestDate *time.Time
	LatestDate   *time.Time
}

const stockSnapshotListFrom = `
FROM stock_snapshots ss
JOIN products p ON p.product_id = ss.product_id
JOIN warehouses w ON w.warehouse_id = ss.warehouse_id`

func (r *StockSnapshotRepository) buildListWhere(
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
) (string, []any, int) {
	where := " WHERE 1=1"
	args := []any{}
	n := 1

	if warehouseID != nil {
		where += fmt.Sprintf(" AND ss.warehouse_id = $%d", n)
		args = append(args, *warehouseID)
		n++
	}
	if productID != nil {
		where += fmt.Sprintf(" AND ss.product_id = $%d", n)
		args = append(args, *productID)
		n++
	}
	if q != nil && *q != "" {
		where += fmt.Sprintf(
			" AND (p.article ILIKE $%d OR p.barcode ILIKE $%d OR w.name ILIKE $%d)",
			n, n, n,
		)
		args = append(args, "%"+*q+"%")
		n++
	}
	if dateFrom != nil {
		where += fmt.Sprintf(" AND ss.snapshot_date >= $%d", n)
		args = append(args, *dateFrom)
		n++
	}
	if dateTo != nil {
		where += fmt.Sprintf(" AND ss.snapshot_date <= $%d", n)
		args = append(args, *dateTo)
		n++
	}
	if ownWarehousesOnly {
		where += " AND w.is_marketplace = false"
	}
	return where, args, n
}

func (r *StockSnapshotRepository) SummarizeList(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
	latestOnly bool,
) (StockSnapshotSummary, error) {
	where, args, _ := r.buildListWhere(warehouseID, productID, q, dateFrom, dateTo, ownWarehousesOnly)
	latestFilter := ""
	if latestOnly {
		latestFilter = " WHERE sub.rn = 1"
	}
	query := `
WITH ranked AS (
	SELECT
		ss.product_id,
		ss.warehouse_id,
		ss.snapshot_date,
		ROW_NUMBER() OVER (
			PARTITION BY ss.product_id, ss.warehouse_id
			ORDER BY ss.snapshot_date DESC, ss.created_at DESC
		) AS rn
` + stockSnapshotListFrom + where + `
)
SELECT
	COUNT(*)::bigint,
	COUNT(DISTINCT (sub.product_id, sub.warehouse_id))::bigint,
	MIN(sub.snapshot_date),
	MAX(sub.snapshot_date)
FROM ranked sub` + latestFilter

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var summary StockSnapshotSummary
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&summary.TotalRows,
		&summary.UniquePairs,
		&summary.EarliestDate,
		&summary.LatestDate,
	)
	return summary, err
}

func (r *StockSnapshotRepository) ListFiltered(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
	latestOnly bool,
	limit int,
	offset int,
) ([]StockSnapshotListRow, error) {
	where, args, n := r.buildListWhere(warehouseID, productID, q, dateFrom, dateTo, ownWarehousesOnly)
	latestFilter := ""
	if latestOnly {
		latestFilter = " WHERE sub.rn = 1"
	}
	query := fmt.Sprintf(`
WITH ranked AS (
	SELECT
		ss.snapshot_id,
		ss.product_id,
		ss.warehouse_id,
		ss.snapshot_date,
		ss.quantity,
		ss.created_by,
		ss.created_at,
		p.article AS product_article,
		p.barcode AS product_barcode,
		w.name AS warehouse_name,
		w.is_marketplace AS is_marketplace_wh,
		ROW_NUMBER() OVER (
			PARTITION BY ss.product_id, ss.warehouse_id
			ORDER BY ss.snapshot_date DESC, ss.created_at DESC
		) AS rn
`+stockSnapshotListFrom+where+`
)
SELECT
	sub.snapshot_id,
	sub.product_id,
	sub.product_article,
	sub.product_barcode,
	sub.warehouse_id,
	sub.warehouse_name,
	sub.is_marketplace_wh,
	sub.snapshot_date,
	sub.quantity,
	(sub.rn = 1) AS is_latest_for_pair,
	sub.created_by,
	sub.created_at
FROM ranked sub`+latestFilter+`
ORDER BY sub.snapshot_date DESC, sub.created_at DESC
LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []StockSnapshotListRow
	for rows.Next() {
		var row StockSnapshotListRow
		if err := rows.Scan(
			&row.SnapshotID,
			&row.ProductID,
			&row.ProductArticle,
			&row.ProductBarcode,
			&row.WarehouseID,
			&row.WarehouseName,
			&row.IsMarketplaceWH,
			&row.SnapshotDate,
			&row.Quantity,
			&row.IsLatestForPair,
			&row.CreatedBy,
			&row.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *StockSnapshotRepository) List(ctx context.Context, limit, offset int, warehouseID, productID *uuid.UUID) ([]StockSnapshot, error) {
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

func (r *StockSnapshotRepository) Create(ctx context.Context, productID, warehouseID uuid.UUID, snapshotDate time.Time, quantity int, createdBy *uuid.UUID) (*StockSnapshot, error) {
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

func (r *StockSnapshotRepository) Update(ctx context.Context, snapshotID uuid.UUID, productID, warehouseID uuid.UUID, snapshotDate time.Time, quantity int) (*StockSnapshot, error) {
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

func (r *StockSnapshotRepository) Delete(ctx context.Context, snapshotID uuid.UUID) error {
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
