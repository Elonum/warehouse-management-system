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
	ErrSupplierOrderNotFound     = errors.New("supplier order not found")
	ErrSupplierOrderExists       = errors.New("supplier order already exists")
	ErrInvalidDateRange          = errors.New("invalid date range")
	ErrInvalidParentOrder        = errors.New("invalid parent order")
	ErrSupplierOrderHasSubOrders = errors.New("supplier order has sub-orders and cannot be deleted")
)

type SupplierOrder struct {
	MainNumber         int
	SubNumber          *int
	OrderID             uuid.UUID
	OrderNumber         string
	Buyer               *string
	StatusID            *uuid.UUID
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
	ParentOrderID       *uuid.UUID
	CreatedBy           *uuid.UUID
	CreatedAt           time.Time
	UpdatedBy           *uuid.UUID
	UpdatedAt           time.Time
}

type SupplierOrderRepository struct {
	pool *pgxpool.Pool
}

func NewSupplierOrderRepository(pool *pgxpool.Pool) *SupplierOrderRepository {
	return &SupplierOrderRepository{pool: pool}
}

func (r *SupplierOrderRepository) GetByID(ctx context.Context, orderID uuid.UUID) (*SupplierOrder, error) {
	query := `
		SELECT main_number, sub_number, order_id, order_number, buyer, status_id, purchase_date, 
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
		&order.MainNumber,
		&order.SubNumber,
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

func (r *SupplierOrderRepository) List(ctx context.Context, limit, offset int, statusID *uuid.UUID) ([]SupplierOrder, error) {
	query := `
		SELECT main_number, sub_number, order_id, order_number, buyer, status_id, purchase_date,
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
			&order.MainNumber,
			&order.SubNumber,
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

func (r *SupplierOrderRepository) Create(ctx context.Context, orderNumber string, mainNumber int, subNumber *int, buyer *string, statusID *uuid.UUID, purchaseDate, plannedReceiptDate, actualReceiptDate *time.Time, logisticsChinaMsk, logisticsMskKzn, logisticsAdditional, logisticsTotal, orderItemCost, orderItemWeight *float64, positionsQty, totalQty int, parentOrderID, createdBy *uuid.UUID) (*SupplierOrder, error) {
	query := `
		INSERT INTO supplier_orders (
			order_number, main_number, sub_number, buyer, status_id, purchase_date, planned_receipt_date,
			actual_receipt_date, logistics_china_msk, logistics_msk_kzn,
			logistics_additional, logistics_total, order_item_cost,
			positions_qty, total_qty, order_item_weight, parent_order_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING main_number, sub_number, order_id, order_number, buyer, status_id, purchase_date,
		          planned_receipt_date, actual_receipt_date, logistics_china_msk,
		          logistics_msk_kzn, logistics_additional, logistics_total,
		          order_item_cost, positions_qty, total_qty, order_item_weight,
		          parent_order_id, created_by, created_at, updated_by, updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var order SupplierOrder
	err := r.pool.QueryRow(ctx, query,
		orderNumber, mainNumber, subNumber, buyer, statusID, purchaseDate, plannedReceiptDate,
		actualReceiptDate, logisticsChinaMsk, logisticsMskKzn,
		logisticsAdditional, logisticsTotal, orderItemCost,
		positionsQty, totalQty, orderItemWeight, parentOrderID, createdBy,
	).Scan(
		&order.MainNumber,
		&order.SubNumber,
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

func (r *SupplierOrderRepository) Update(ctx context.Context, orderID uuid.UUID, orderNumber string, buyer *string, statusID *uuid.UUID, purchaseDate, plannedReceiptDate, actualReceiptDate *time.Time, logisticsChinaMsk, logisticsMskKzn, logisticsAdditional, logisticsTotal, orderItemCost, orderItemWeight *float64, positionsQty, totalQty int, parentOrderID, updatedBy *uuid.UUID) (*SupplierOrder, error) {
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
		RETURNING main_number, sub_number, order_id, order_number, buyer, status_id, purchase_date,
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
		&order.MainNumber,
		&order.SubNumber,
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

// HasSubOrders checks if the given order has any sub-orders.
func (r *SupplierOrderRepository) HasSubOrders(ctx context.Context, orderID uuid.UUID) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM supplier_orders
		WHERE parent_order_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var hasSubOrders bool
	err := r.pool.QueryRow(ctx, query, orderID).Scan(&hasSubOrders)
	if err != nil {
		return false, err
	}

	return hasSubOrders, nil
}

func (r *SupplierOrderRepository) Delete(ctx context.Context, orderID uuid.UUID) error {
	query := `
		DELETE FROM supplier_orders
		WHERE order_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, orderID)
	if err != nil {
		errMsg := err.Error()
		// Check for foreign key constraint violation (sub-orders exist)
		if strings.Contains(errMsg, "supplier_orders_parent_order_id_fkey") ||
			strings.Contains(errMsg, "foreign key") ||
			strings.Contains(errMsg, "23503") {
			return ErrSupplierOrderHasSubOrders
		}
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSupplierOrderNotFound
	}

	return nil
}

// GetNextMainNumber returns the next main_number value for a new root supplier order.
// It is calculated as MAX(main_number) + 1. In case of concurrent creations, the unique
// constraint on (main_number, sub_number) will prevent duplicates.
func (r *SupplierOrderRepository) GetNextMainNumber(ctx context.Context) (int, error) {
	query := `
		SELECT COALESCE(MAX(main_number), 0) + 1
		FROM supplier_orders
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var next int
	if err := r.pool.QueryRow(ctx, query).Scan(&next); err != nil {
		return 0, err
	}
	return next, nil
}

// GetNextSubNumber returns the next sub_number value for a given main_number.
// It is calculated as MAX(sub_number) + 1 limited to that main_number.
func (r *SupplierOrderRepository) GetNextSubNumber(ctx context.Context, mainNumber int) (int, error) {
	query := `
		SELECT COALESCE(MAX(sub_number), 0) + 1
		FROM supplier_orders
		WHERE main_number = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var next int
	if err := r.pool.QueryRow(ctx, query, mainNumber).Scan(&next); err != nil {
		return 0, err
	}
	return next, nil
}

// UpdateAggregates updates only aggregate fields of the order that are derived from items.
// IMPORTANT:
//   - logistics_total is *not* touched here and is controlled by business logic
//     (logistics_china_msk + logistics_msk_kzn + logistics_additional).
func (r *SupplierOrderRepository) UpdateAggregates(ctx context.Context, orderID uuid.UUID, positionsQty, totalQty int, orderItemWeight, orderItemCost *float64, updatedBy *uuid.UUID) error {
	query := `
		UPDATE supplier_orders
		SET positions_qty = $1,
		    total_qty = $2,
		    order_item_weight = $3,
		    order_item_cost = $4,
		    updated_by = $5,
		    updated_at = CURRENT_TIMESTAMP
		WHERE order_id = $6
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, positionsQty, totalQty, orderItemWeight, orderItemCost, updatedBy, orderID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSupplierOrderNotFound
	}

	return nil
}
