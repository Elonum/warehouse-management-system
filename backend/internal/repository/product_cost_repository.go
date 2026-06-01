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
	ErrProductCostNotFound = errors.New("product cost not found")
	ErrProductCostExists   = errors.New("product cost already exists")
	ErrPeriodOverlap       = errors.New("product cost period overlaps an existing period")
)

type ProductCost struct {
	CostID              uuid.UUID
	ProductID           uuid.UUID
	PeriodStart         time.Time
	PeriodEnd           *time.Time
	UnitCostToWarehouse float64
	Notes               *string
	CreatedBy           *uuid.UUID
	CreatedAt           time.Time
	UpdatedBy           *uuid.UUID
	UpdatedAt           time.Time
}

type ProductCostListRow struct {
	CostID              uuid.UUID
	ProductID           uuid.UUID
	ProductArticle      string
	ProductBarcode      string
	PeriodStart         time.Time
	PeriodEnd           *time.Time
	UnitCostToWarehouse float64
	IsActive            bool
	Notes               *string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type ProductCostSummary struct {
	TotalRows   int64
	ActiveRows  int64
	ProductRows int64
}

type ProductCostRepository struct {
	pool *pgxpool.Pool
}

func NewProductCostRepository(pool *pgxpool.Pool) *ProductCostRepository {
	return &ProductCostRepository{pool: pool}
}

func DateOnlyUTC(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

const productCostFrom = `
FROM product_costs pc
JOIN products p ON p.product_id = pc.product_id`

func (r *ProductCostRepository) buildListWhere(
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	activeOnly bool,
) (string, []any, int) {
	where := " WHERE 1=1"
	args := []any{}
	n := 1

	if productID != nil {
		where += fmt.Sprintf(" AND pc.product_id = $%d", n)
		args = append(args, *productID)
		n++
	}
	if q != nil && *q != "" {
		where += fmt.Sprintf(" AND (p.article ILIKE $%d OR p.barcode ILIKE $%d)", n, n)
		args = append(args, "%"+*q+"%")
		n++
	}
	if dateFrom != nil {
		where += fmt.Sprintf(" AND COALESCE(pc.period_end, '9999-12-31'::date) >= $%d", n)
		args = append(args, DateOnlyUTC(*dateFrom))
		n++
	}
	if dateTo != nil {
		where += fmt.Sprintf(" AND pc.period_start <= $%d", n)
		args = append(args, DateOnlyUTC(*dateTo))
		n++
	}
	if activeOnly {
		where += " AND CURRENT_DATE >= pc.period_start AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)"
	}
	return where, args, n
}

func (r *ProductCostRepository) SummarizeList(
	ctx context.Context,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	activeOnly bool,
) (ProductCostSummary, error) {
	where, args, _ := r.buildListWhere(productID, q, dateFrom, dateTo, activeOnly)
	query := `
SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (
        WHERE CURRENT_DATE >= pc.period_start
          AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)
    )::bigint,
    COUNT(DISTINCT pc.product_id)::bigint
` + productCostFrom + where

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var summary ProductCostSummary
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&summary.TotalRows,
		&summary.ActiveRows,
		&summary.ProductRows,
	)
	return summary, err
}

func (r *ProductCostRepository) ListFiltered(
	ctx context.Context,
	productID *uuid.UUID,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	activeOnly bool,
	limit int,
	offset int,
) ([]ProductCostListRow, error) {
	where, args, n := r.buildListWhere(productID, q, dateFrom, dateTo, activeOnly)
	query := fmt.Sprintf(`
SELECT
    pc.cost_id,
    pc.product_id,
    p.article,
    p.barcode,
    pc.period_start,
    pc.period_end,
    pc.unit_cost_to_warehouse,
    (CURRENT_DATE >= pc.period_start AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)) AS is_active,
    pc.notes,
    pc.created_at,
    pc.updated_at
`+productCostFrom+where+`
ORDER BY p.article ASC, pc.period_start DESC, pc.created_at DESC
LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ProductCostListRow
	for rows.Next() {
		var row ProductCostListRow
		if err := rows.Scan(
			&row.CostID,
			&row.ProductID,
			&row.ProductArticle,
			&row.ProductBarcode,
			&row.PeriodStart,
			&row.PeriodEnd,
			&row.UnitCostToWarehouse,
			&row.IsActive,
			&row.Notes,
			&row.CreatedAt,
			&row.UpdatedAt,
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

func (r *ProductCostRepository) HasOverlap(
	ctx context.Context,
	productID uuid.UUID,
	periodStart time.Time,
	periodEnd *time.Time,
	excludeCostID *uuid.UUID,
) (bool, error) {
	start := DateOnlyUTC(periodStart)
	args := []any{productID, start}
	query := `
SELECT 1
FROM product_costs
WHERE product_id = $1
  AND period_start <= COALESCE($3, '9999-12-31'::date)
  AND COALESCE(period_end, '9999-12-31'::date) >= $2`
	n := 4
	if periodEnd != nil {
		end := DateOnlyUTC(*periodEnd)
		args = append(args, end)
	} else {
		args = append(args, nil)
	}
	if excludeCostID != nil {
		query += fmt.Sprintf(" AND cost_id <> $%d", n)
		args = append(args, *excludeCostID)
	}
	query += " LIMIT 1"

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var one int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&one)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *ProductCostRepository) ClosePeriodsBefore(
	ctx context.Context,
	productID uuid.UUID,
	newPeriodStart time.Time,
	updatedBy *uuid.UUID,
) error {
	start := DateOnlyUTC(newPeriodStart)
	if start.IsZero() {
		return nil
	}
	closeEnd := start.AddDate(0, 0, -1)

	query := `
UPDATE product_costs
SET period_end = $1, updated_by = $2, updated_at = NOW()
WHERE product_id = $3
  AND period_start < $4
  AND (period_end IS NULL OR period_end >= $4)
  AND period_start <= $1`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, closeEnd, updatedBy, productID, start)
	return err
}

func (r *ProductCostRepository) GetByID(ctx context.Context, costID uuid.UUID) (*ProductCost, error) {
	query := `
		SELECT cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
		FROM product_costs
		WHERE cost_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var cost ProductCost
	err := r.pool.QueryRow(ctx, query, costID).Scan(
		&cost.CostID,
		&cost.ProductID,
		&cost.PeriodStart,
		&cost.PeriodEnd,
		&cost.UnitCostToWarehouse,
		&cost.Notes,
		&cost.CreatedBy,
		&cost.CreatedAt,
		&cost.UpdatedBy,
		&cost.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductCostNotFound
		}
		return nil, err
	}

	return &cost, nil
}

func (r *ProductCostRepository) Create(
	ctx context.Context,
	productID uuid.UUID,
	periodStart time.Time,
	periodEnd *time.Time,
	unitCostToWarehouse float64,
	notes *string,
	createdBy *uuid.UUID,
) (*ProductCost, error) {
	query := `
		INSERT INTO product_costs (product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	start := DateOnlyUTC(periodStart)
	var end any
	if periodEnd != nil {
		e := DateOnlyUTC(*periodEnd)
		end = e
	}

	var productCost ProductCost
	err := r.pool.QueryRow(ctx, query, productID, start, end, unitCostToWarehouse, notes, createdBy).Scan(
		&productCost.CostID,
		&productCost.ProductID,
		&productCost.PeriodStart,
		&productCost.PeriodEnd,
		&productCost.UnitCostToWarehouse,
		&productCost.Notes,
		&productCost.CreatedBy,
		&productCost.CreatedAt,
		&productCost.UpdatedBy,
		&productCost.UpdatedAt,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrProductCostExists
		}
		return nil, err
	}

	return &productCost, nil
}

func (r *ProductCostRepository) Update(
	ctx context.Context,
	costID uuid.UUID,
	productID uuid.UUID,
	periodStart time.Time,
	periodEnd *time.Time,
	unitCostToWarehouse float64,
	notes *string,
	updatedBy *uuid.UUID,
) (*ProductCost, error) {
	query := `
		UPDATE product_costs
		SET product_id = $1, period_start = $2, period_end = $3, unit_cost_to_warehouse = $4, notes = $5, updated_by = $6, updated_at = NOW()
		WHERE cost_id = $7
		RETURNING cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	start := DateOnlyUTC(periodStart)
	var end any
	if periodEnd != nil {
		e := DateOnlyUTC(*periodEnd)
		end = e
	}

	var productCost ProductCost
	err := r.pool.QueryRow(ctx, query, productID, start, end, unitCostToWarehouse, notes, updatedBy, costID).Scan(
		&productCost.CostID,
		&productCost.ProductID,
		&productCost.PeriodStart,
		&productCost.PeriodEnd,
		&productCost.UnitCostToWarehouse,
		&productCost.Notes,
		&productCost.CreatedBy,
		&productCost.CreatedAt,
		&productCost.UpdatedBy,
		&productCost.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductCostNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrProductCostExists
		}
		return nil, err
	}

	return &productCost, nil
}

func (r *ProductCostRepository) Delete(ctx context.Context, costID uuid.UUID) error {
	query := `DELETE FROM product_costs WHERE cost_id = $1`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, costID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrProductCostNotFound
	}

	return nil
}

func (r *ProductCostRepository) CreateWithClosePrevious(
	ctx context.Context,
	productID uuid.UUID,
	periodStart time.Time,
	periodEnd *time.Time,
	unitCostToWarehouse float64,
	notes *string,
	createdBy *uuid.UUID,
	closePrevious bool,
) (*ProductCost, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	start := DateOnlyUTC(periodStart)
	var end *time.Time
	if periodEnd != nil {
		e := DateOnlyUTC(*periodEnd)
		end = &e
	}

	if end != nil && end.Before(start) {
		return nil, ErrInvalidDateRange
	}

	if closePrevious {
		closeEnd := start.AddDate(0, 0, -1)
		_, err = tx.Exec(ctx, `
UPDATE product_costs
SET period_end = $1, updated_by = $2, updated_at = NOW()
WHERE product_id = $3
  AND period_start < $4
  AND (period_end IS NULL OR period_end >= $4)
  AND period_start <= $1`, closeEnd, createdBy, productID, start)
		if err != nil {
			return nil, err
		}
	}

	overlap, err := r.hasOverlapTx(ctx, tx, productID, start, end, nil)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, ErrPeriodOverlap
	}

	var endVal any
	if end != nil {
		endVal = *end
	}

	var productCost ProductCost
	err = tx.QueryRow(ctx, `
INSERT INTO product_costs (product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at`,
		productID, start, endVal, unitCostToWarehouse, notes, createdBy,
	).Scan(
		&productCost.CostID,
		&productCost.ProductID,
		&productCost.PeriodStart,
		&productCost.PeriodEnd,
		&productCost.UnitCostToWarehouse,
		&productCost.Notes,
		&productCost.CreatedBy,
		&productCost.CreatedAt,
		&productCost.UpdatedBy,
		&productCost.UpdatedAt,
	)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") || strings.Contains(errMsg, "unique constraint") {
			return nil, ErrProductCostExists
		}
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &productCost, nil
}

func (r *ProductCostRepository) hasOverlapTx(
	ctx context.Context,
	tx pgx.Tx,
	productID uuid.UUID,
	periodStart time.Time,
	periodEnd *time.Time,
	excludeCostID *uuid.UUID,
) (bool, error) {
	args := []any{productID, periodStart}
	query := `
SELECT 1 FROM product_costs
WHERE product_id = $1
  AND period_start <= COALESCE($3, '9999-12-31'::date)
  AND COALESCE(period_end, '9999-12-31'::date) >= $2`
	if periodEnd != nil {
		args = append(args, *periodEnd)
	} else {
		args = append(args, nil)
	}
	n := 4
	if excludeCostID != nil {
		query += fmt.Sprintf(" AND cost_id <> $%d", n)
		args = append(args, *excludeCostID)
		n++
	}
	query += " LIMIT 1"

	var one int
	err := tx.QueryRow(ctx, query, args...).Scan(&one)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
