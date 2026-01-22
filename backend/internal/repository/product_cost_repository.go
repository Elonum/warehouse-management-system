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
)

type ProductCost struct {
	CostID              uuid.UUID
	ProductID           uuid.UUID
	PeriodStart         time.Time
	PeriodEnd           time.Time
	UnitCostToWarehouse float64
	Notes               *string
	CreatedBy           *uuid.UUID
	CreatedAt           time.Time
	UpdatedBy           *uuid.UUID
	UpdatedAt           time.Time
}

type ProductCostRepository struct {
	pool *pgxpool.Pool
}

func NewProductCostRepository(pool *pgxpool.Pool) *ProductCostRepository {
	return &ProductCostRepository{pool: pool}
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

func (r *ProductCostRepository) List(ctx context.Context, limit, offset int, productID *uuid.UUID) ([]ProductCost, error) {
	query := `
		SELECT cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
		FROM product_costs
	`
	args := []interface{}{}
	argPos := 1

	if productID != nil {
		query += fmt.Sprintf(" WHERE product_id = $%d", argPos)
		args = append(args, *productID)
		argPos++
	}

	query += fmt.Sprintf(" ORDER BY cost_id LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var costs []ProductCost
	for rows.Next() {
		var cost ProductCost
		if err := rows.Scan(
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
		); err != nil {
			return nil, err
		}
		costs = append(costs, cost)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return costs, nil
}

func (r *ProductCostRepository) Create(ctx context.Context, productID uuid.UUID, periodStart, periodEnd time.Time, unitCostToWarehouse float64, notes *string, createdBy *uuid.UUID) (*ProductCost, error) {
	query := `
		INSERT INTO product_costs (product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var productCost ProductCost
	err := r.pool.QueryRow(ctx, query, productID, periodStart, periodEnd, unitCostToWarehouse, notes, createdBy).Scan(
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

func (r *ProductCostRepository) Update(ctx context.Context, costID uuid.UUID, productID uuid.UUID, periodStart, periodEnd time.Time, unitCostToWarehouse float64, notes *string, updatedBy *uuid.UUID) (*ProductCost, error) {
	query := `
		UPDATE product_costs
		SET product_id = $1, period_start = $2, period_end = $3, unit_cost_to_warehouse = $4, notes = $5, updated_by = $6, updated_at = NOW()
		WHERE cost_id = $7
		RETURNING cost_id, product_id, period_start, period_end, unit_cost_to_warehouse, notes, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var productCost ProductCost
	err := r.pool.QueryRow(ctx, query, productID, periodStart, periodEnd, unitCostToWarehouse, notes, updatedBy, costID).Scan(
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
	query := `
		DELETE FROM product_costs
		WHERE cost_id = $1
	`

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
