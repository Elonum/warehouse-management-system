package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func (r *ProductCostRepository) SyncProductUnitCost(ctx context.Context, productID uuid.UUID) error {
	query := `
UPDATE products
SET unit_cost = (
	SELECT pc.unit_cost_to_warehouse
	FROM product_costs pc
	WHERE pc.product_id = $1
	  AND CURRENT_DATE >= pc.period_start
	  AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)
	ORDER BY pc.period_start DESC
	LIMIT 1
)
WHERE product_id = $1`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, err := r.pool.Exec(ctx, query, productID)
	return err
}

func (r *ProductCostRepository) CountOverlapPairs(ctx context.Context) (int64, error) {
	query := `
SELECT COUNT(*)::bigint
FROM product_costs a
JOIN product_costs b
  ON a.product_id = b.product_id
 AND a.cost_id < b.cost_id
 AND a.period_start <= COALESCE(b.period_end, '9999-12-31'::date)
 AND b.period_start <= COALESCE(a.period_end, '9999-12-31'::date)`

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var n int64
	err := r.pool.QueryRow(ctx, query).Scan(&n)
	return n, err
}

func (r *ProductCostRepository) ListOverlapPairs(ctx context.Context, limit, offset int) ([]ProductCostOverlapRow, error) {
	query := `
SELECT
	p.product_id,
	p.article,
	a.cost_id,
	a.period_start,
	a.period_end,
	b.cost_id,
	b.period_start,
	b.period_end
FROM product_costs a
JOIN product_costs b
  ON a.product_id = b.product_id
 AND a.cost_id < b.cost_id
 AND a.period_start <= COALESCE(b.period_end, '9999-12-31'::date)
 AND b.period_start <= COALESCE(a.period_end, '9999-12-31'::date)
JOIN products p ON p.product_id = a.product_id
ORDER BY p.article, a.period_start
LIMIT $1 OFFSET $2`

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ProductCostOverlapRow
	for rows.Next() {
		var row ProductCostOverlapRow
		if err := rows.Scan(
			&row.ProductID,
			&row.ProductArticle,
			&row.CostIDA,
			&row.PeriodAStart,
			&row.PeriodAEnd,
			&row.CostIDB,
			&row.PeriodBStart,
			&row.PeriodBEnd,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *ProductCostRepository) CountProductsMissingCost(
	ctx context.Context,
	q *string,
) (int64, error) {
	where, args, _ := r.buildMissingCostWhere(q)
	query := `
SELECT COUNT(DISTINCT cs.product_id)::bigint
FROM vw_current_stock cs
JOIN products p ON p.product_id = cs.product_id
JOIN warehouses w ON w.warehouse_id = cs.warehouse_id AND w.is_marketplace = false` + activeProductCostLateral + where

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var n int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&n)
	return n, err
}

func (r *ProductCostRepository) ListProductsMissingCost(
	ctx context.Context,
	q *string,
	limit int,
	offset int,
) ([]ProductMissingCostRow, error) {
	where, args, n := r.buildMissingCostWhere(q)
	query := fmt.Sprintf(`
SELECT
	cs.product_id,
	p.article,
	p.barcode,
	SUM(cs.current_quantity)::bigint AS total_qty,
	COUNT(DISTINCT cs.warehouse_id)::bigint AS wh_count
FROM vw_current_stock cs
JOIN products p ON p.product_id = cs.product_id
JOIN warehouses w ON w.warehouse_id = cs.warehouse_id AND w.is_marketplace = false`+activeProductCostLateral+where+`
GROUP BY cs.product_id, p.article, p.barcode
ORDER BY p.article ASC
LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ProductMissingCostRow
	for rows.Next() {
		var row ProductMissingCostRow
		if err := rows.Scan(
			&row.ProductID,
			&row.ProductArticle,
			&row.ProductBarcode,
			&row.TotalQuantity,
			&row.WarehouseCount,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *ProductCostRepository) buildMissingCostWhere(q *string) (string, []any, int) {
	where := `
 WHERE cs.current_quantity > 0
   AND ac.unit_cost_to_warehouse IS NULL`
	args := []any{}
	n := 1
	if q != nil && *q != "" {
		where += fmt.Sprintf(" AND (p.article ILIKE $%d OR p.barcode ILIKE $%d)", n, n)
		args = append(args, "%"+*q+"%")
		n++
	}
	return where, args, n
}

func (r *ProductCostRepository) GetActiveUnitCosts(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]float64, error) {
	out := make(map[uuid.UUID]float64)
	if len(productIDs) == 0 {
		return out, nil
	}

	query := `
SELECT DISTINCT ON (pc.product_id)
	pc.product_id,
	pc.unit_cost_to_warehouse
FROM product_costs pc
WHERE pc.product_id = ANY($1)
  AND CURRENT_DATE >= pc.period_start
  AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)
ORDER BY pc.product_id, pc.period_start DESC`

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, productIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		var cost float64
		if err := rows.Scan(&id, &cost); err != nil {
			return nil, err
		}
		out[id] = cost
	}
	return out, rows.Err()
}
