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
	ErrSupplierOrderNotFound = errors.New("supplier order not found")
	ErrSupplierOrderExists   = errors.New("supplier order already exists")
	ErrInvalidDateRange      = errors.New("invalid date range")
	ErrInvalidParentOrder    = errors.New("invalid parent order")
)

type SupplierOrder struct {
	OrderID             int
	OrderNumber         string
	Buyer               *string
	StatusID            *int
	PurchaseDate        *time.Time
	PlannedReceiptDate  *time.Time
	ActualReceiptDate   *time.Time
	LogisticsChinaMsk   *float64
	LogisticsMskKzn     *float64
	LogisticsAdditional *float64
	LogisticsTotal      *float64
	OrderItemCost       *float64
	PositionsQty        int
	TotalQty            int
	OrderItemWeight     *float64
	ParentOrderID       *int
	CreatedBy           *int
	CreatedAt           time.Time
	UpdatedBy           *int
	UpdatedAt           time.Time
}

type SupplierOrderRepository struct {
	pool *pgxpool.Pool
}

func NewSupplierOrderRepository(pool *pgxpool.Pool) *SupplierOrderRepository {
	return &SupplierOrderRepository{pool: pool}
}

func (r *SupplierOrderRepository) GetByID(ctx context.Context, orderID int) (*SupplierOrder, error) {
	query := `
		SELECT order_id, order_number, buyer, status_id, purchase_date, 
		       planned_receipt_date, actual_receipt_date, logistics_china_msk,
		       logistics_msk_kzn, logistics_additional, logistics_total,
		       order_item_cost, positions_qty, total_qty, order_item_weight,
		       parent_order_id, created_by, created_at, updated_by, updated_at
		FROM supplier_orders
		WHERE order_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var order SupplierOrder
	err := r.pool.QueryRow(ctx, query, orderID).Scan(
		&order.OrderID,
		&order.OrderNumber,
		&order.Buyer,
		&order.StatusID,
		&order.PurchaseDate,
		&order.PlannedReceiptDate,
		&order.ActualReceiptDate,
		&order.LogisticsChinaMsk,
		&order.LogisticsMskKzn,
		&order.LogisticsAdditional,
		&order.LogisticsTotal,
		&order.OrderItemCost,
		&order.PositionsQty,
		&order.TotalQty,
		&order.OrderItemWeight,
		&order.ParentOrderID,
		&order.CreatedBy,
		&order.CreatedAt,
		&order.UpdatedBy,
		&order.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderNotFound
		}
		return nil, err
	}

	return &order, nil
}

func (r *SupplierOrderRepository) List(ctx context.Context, limit, offset int, statusID *int) ([]SupplierOrder, error) {
	query := `
		SELECT order_id, order_number, buyer, status_id, purchase_date,
		       planned_receipt_date, actual_receipt_date, logistics_china_msk,
		       logistics_msk_kzn, logistics_additional, logistics_total,
		       order_item_cost, positions_qty, total_qty, order_item_weight,
		       parent_order_id, created_by, created_at, updated_by, updated_at
		FROM supplier_orders
	`
	args := []any{}
	argPos := 1

	if statusID != nil {
		query += ` WHERE status_id = $1`
		args = append(args, *statusID)
		argPos++
	}

	query += fmt.Sprintf(` ORDER BY order_id DESC LIMIT $%d OFFSET $%d`, argPos, argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []SupplierOrder
	for rows.Next() {
		var order SupplierOrder
		if err := rows.Scan(
			&order.OrderID,
			&order.OrderNumber,
			&order.Buyer,
			&order.StatusID,
			&order.PurchaseDate,
			&order.PlannedReceiptDate,
			&order.ActualReceiptDate,
			&order.LogisticsChinaMsk,
			&order.LogisticsMskKzn,
			&order.LogisticsAdditional,
			&order.LogisticsTotal,
			&order.OrderItemCost,
			&order.PositionsQty,
			&order.TotalQty,
			&order.OrderItemWeight,
			&order.ParentOrderID,
			&order.CreatedBy,
			&order.CreatedAt,
			&order.UpdatedBy,
			&order.UpdatedAt,
		); err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *SupplierOrderRepository) Create(ctx context.Context, orderNumber string, buyer *string, statusID *int, purchaseDate, plannedReceiptDate, actualReceiptDate *time.Time, logisticsChinaMsk, logisticsMskKzn, logisticsAdditional, logisticsTotal, orderItemCost, orderItemWeight *float64, positionsQty, totalQty int, parentOrderID, createdBy *int) (*SupplierOrder, error) {
	query := `
		INSERT INTO supplier_orders (
			order_number, buyer, status_id, purchase_date, planned_receipt_date,
			actual_receipt_date, logistics_china_msk, logistics_msk_kzn,
			logistics_additional, logistics_total, order_item_cost,
			positions_qty, total_qty, order_item_weight, parent_order_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING order_id, order_number, buyer, status_id, purchase_date,
		          planned_receipt_date, actual_receipt_date, logistics_china_msk,
		          logistics_msk_kzn, logistics_additional, logistics_total,
		          order_item_cost, positions_qty, total_qty, order_item_weight,
		          parent_order_id, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var order SupplierOrder
	err := r.pool.QueryRow(ctx, query,
		orderNumber, buyer, statusID, purchaseDate, plannedReceiptDate,
		actualReceiptDate, logisticsChinaMsk, logisticsMskKzn,
		logisticsAdditional, logisticsTotal, orderItemCost,
		positionsQty, totalQty, orderItemWeight, parentOrderID, createdBy,
	).Scan(
		&order.OrderID,
		&order.OrderNumber,
		&order.Buyer,
		&order.StatusID,
		&order.PurchaseDate,
		&order.PlannedReceiptDate,
		&order.ActualReceiptDate,
		&order.LogisticsChinaMsk,
		&order.LogisticsMskKzn,
		&order.LogisticsAdditional,
		&order.LogisticsTotal,
		&order.OrderItemCost,
		&order.PositionsQty,
		&order.TotalQty,
		&order.OrderItemWeight,
		&order.ParentOrderID,
		&order.CreatedBy,
		&order.CreatedAt,
		&order.UpdatedBy,
		&order.UpdatedAt,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "supplier_orders_order_number_key") {
			return nil, ErrSupplierOrderExists
		}
		return nil, err
	}

	return &order, nil
}

func (r *SupplierOrderRepository) Update(ctx context.Context, orderID int, orderNumber string, buyer *string, statusID *int, purchaseDate, plannedReceiptDate, actualReceiptDate *time.Time, logisticsChinaMsk, logisticsMskKzn, logisticsAdditional, logisticsTotal, orderItemCost, orderItemWeight *float64, positionsQty, totalQty int, parentOrderID, updatedBy *int) (*SupplierOrder, error) {
	query := `
		UPDATE supplier_orders
		SET order_number = $1, buyer = $2, status_id = $3, purchase_date = $4,
		    planned_receipt_date = $5, actual_receipt_date = $6,
		    logistics_china_msk = $7, logistics_msk_kzn = $8,
		    logistics_additional = $9, logistics_total = $10,
		    order_item_cost = $11, positions_qty = $12, total_qty = $13,
		    order_item_weight = $14, parent_order_id = $15, updated_by = $16,
		    updated_at = CURRENT_TIMESTAMP
		WHERE order_id = $17
		RETURNING order_id, order_number, buyer, status_id, purchase_date,
		          planned_receipt_date, actual_receipt_date, logistics_china_msk,
		          logistics_msk_kzn, logistics_additional, logistics_total,
		          order_item_cost, positions_qty, total_qty, order_item_weight,
		          parent_order_id, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var order SupplierOrder
	err := r.pool.QueryRow(ctx, query,
		orderNumber, buyer, statusID, purchaseDate, plannedReceiptDate,
		actualReceiptDate, logisticsChinaMsk, logisticsMskKzn,
		logisticsAdditional, logisticsTotal, orderItemCost,
		positionsQty, totalQty, orderItemWeight, parentOrderID, updatedBy, orderID,
	).Scan(
		&order.OrderID,
		&order.OrderNumber,
		&order.Buyer,
		&order.StatusID,
		&order.PurchaseDate,
		&order.PlannedReceiptDate,
		&order.ActualReceiptDate,
		&order.LogisticsChinaMsk,
		&order.LogisticsMskKzn,
		&order.LogisticsAdditional,
		&order.LogisticsTotal,
		&order.OrderItemCost,
		&order.PositionsQty,
		&order.TotalQty,
		&order.OrderItemWeight,
		&order.ParentOrderID,
		&order.CreatedBy,
		&order.CreatedAt,
		&order.UpdatedBy,
		&order.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrSupplierOrderExists
		}
		return nil, err
	}

	return &order, nil
}

func (r *SupplierOrderRepository) Delete(ctx context.Context, orderID int) error {
	query := `
		DELETE FROM supplier_orders
		WHERE order_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, orderID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSupplierOrderNotFound
	}

	return nil
}
