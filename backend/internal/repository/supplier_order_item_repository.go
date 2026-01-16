package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSupplierOrderItemNotFound = errors.New("supplier order item not found")
	ErrSupplierOrderItemExists   = errors.New("supplier order item already exists")
	ErrInvalidQuantity           = errors.New("invalid quantity")
)

type SupplierOrderItem struct {
	OrderItemID     int
	OrderID         int
	ProductID       int
	WarehouseID     int
	OrderedQty      int
	ReceivedQty     int
	PurchasePrice   *float64
	TotalPrice      *float64
	TotalWeight     int
	TotalLogistics  *float64
	UnitLogistics   *float64
	UnitSelfCost    *float64
	TotalSelfCost   *float64
	FulfillmentCost *float64
}

type SupplierOrderItemRepository struct {
	pool *pgxpool.Pool
}

func NewSupplierOrderItemRepository(pool *pgxpool.Pool) *SupplierOrderItemRepository {
	return &SupplierOrderItemRepository{pool: pool}
}

func (r *SupplierOrderItemRepository) GetByID(ctx context.Context, itemID int) (*SupplierOrderItem, error) {
	query := `
		SELECT order_item_id, order_id, product_id, warehouse_id, ordered_qty,
		       received_qty, purchase_price, total_price, total_weight,
		       total_logistics, unit_logistics, unit_self_cost, total_self_cost,
		       fulfillment_cost
		FROM supplier_order_items
		WHERE order_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item SupplierOrderItem
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&item.OrderItemID,
		&item.OrderID,
		&item.ProductID,
		&item.WarehouseID,
		&item.OrderedQty,
		&item.ReceivedQty,
		&item.PurchasePrice,
		&item.TotalPrice,
		&item.TotalWeight,
		&item.TotalLogistics,
		&item.UnitLogistics,
		&item.UnitSelfCost,
		&item.TotalSelfCost,
		&item.FulfillmentCost,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderItemNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *SupplierOrderItemRepository) GetByOrderID(ctx context.Context, orderID int) ([]SupplierOrderItem, error) {
	query := `
		SELECT order_item_id, order_id, product_id, warehouse_id, ordered_qty,
		       received_qty, purchase_price, total_price, total_weight,
		       total_logistics, unit_logistics, unit_self_cost, total_self_cost,
		       fulfillment_cost
		FROM supplier_order_items
		WHERE order_id = $1
		ORDER BY order_item_id
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []SupplierOrderItem
	for rows.Next() {
		var item SupplierOrderItem
		if err := rows.Scan(
			&item.OrderItemID,
			&item.OrderID,
			&item.ProductID,
			&item.WarehouseID,
			&item.OrderedQty,
			&item.ReceivedQty,
			&item.PurchasePrice,
			&item.TotalPrice,
			&item.TotalWeight,
			&item.TotalLogistics,
			&item.UnitLogistics,
			&item.UnitSelfCost,
			&item.TotalSelfCost,
			&item.FulfillmentCost,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (r *SupplierOrderItemRepository) Create(ctx context.Context, orderID, productID, warehouseID, orderedQty, receivedQty, totalWeight int, purchasePrice, totalPrice, totalLogistics, unitLogistics, unitSelfCost, totalSelfCost, fulfillmentCost *float64) (*SupplierOrderItem, error) {
	query := `
		INSERT INTO supplier_order_items (
			order_id, product_id, warehouse_id, ordered_qty, received_qty,
			purchase_price, total_price, total_weight, total_logistics,
			unit_logistics, unit_self_cost, total_self_cost, fulfillment_cost
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING order_item_id, order_id, product_id, warehouse_id, ordered_qty,
		          received_qty, purchase_price, total_price, total_weight,
		          total_logistics, unit_logistics, unit_self_cost, total_self_cost,
		          fulfillment_cost
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item SupplierOrderItem
	err := r.pool.QueryRow(ctx, query,
		orderID, productID, warehouseID, orderedQty, receivedQty,
		purchasePrice, totalPrice, totalWeight, totalLogistics,
		unitLogistics, unitSelfCost, totalSelfCost, fulfillmentCost,
	).Scan(
		&item.OrderItemID,
		&item.OrderID,
		&item.ProductID,
		&item.WarehouseID,
		&item.OrderedQty,
		&item.ReceivedQty,
		&item.PurchasePrice,
		&item.TotalPrice,
		&item.TotalWeight,
		&item.TotalLogistics,
		&item.UnitLogistics,
		&item.UnitSelfCost,
		&item.TotalSelfCost,
		&item.FulfillmentCost,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrSupplierOrderItemExists
		}
		return nil, err
	}

	return &item, nil
}

func (r *SupplierOrderItemRepository) Update(ctx context.Context, itemID, orderID, productID, warehouseID, orderedQty, receivedQty, totalWeight int, purchasePrice, totalPrice, totalLogistics, unitLogistics, unitSelfCost, totalSelfCost, fulfillmentCost *float64) (*SupplierOrderItem, error) {
	query := `
		UPDATE supplier_order_items
		SET order_id = $1, product_id = $2, warehouse_id = $3, ordered_qty = $4,
		    received_qty = $5, purchase_price = $6, total_price = $7,
		    total_weight = $8, total_logistics = $9, unit_logistics = $10,
		    unit_self_cost = $11, total_self_cost = $12, fulfillment_cost = $13
		WHERE order_item_id = $14
		RETURNING order_item_id, order_id, product_id, warehouse_id, ordered_qty,
		          received_qty, purchase_price, total_price, total_weight,
		          total_logistics, unit_logistics, unit_self_cost, total_self_cost,
		          fulfillment_cost
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item SupplierOrderItem
	err := r.pool.QueryRow(ctx, query,
		orderID, productID, warehouseID, orderedQty, receivedQty,
		purchasePrice, totalPrice, totalWeight, totalLogistics,
		unitLogistics, unitSelfCost, totalSelfCost, fulfillmentCost, itemID,
	).Scan(
		&item.OrderItemID,
		&item.OrderID,
		&item.ProductID,
		&item.WarehouseID,
		&item.OrderedQty,
		&item.ReceivedQty,
		&item.PurchasePrice,
		&item.TotalPrice,
		&item.TotalWeight,
		&item.TotalLogistics,
		&item.UnitLogistics,
		&item.UnitSelfCost,
		&item.TotalSelfCost,
		&item.FulfillmentCost,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderItemNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrSupplierOrderItemExists
		}
		return nil, err
	}

	return &item, nil
}

func (r *SupplierOrderItemRepository) Delete(ctx context.Context, itemID int) error {
	query := `
		DELETE FROM supplier_order_items
		WHERE order_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, itemID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSupplierOrderItemNotFound
	}

	return nil
}

func (r *SupplierOrderItemRepository) DeleteByOrderID(ctx context.Context, orderID int) error {
	query := `
		DELETE FROM supplier_order_items
		WHERE order_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, orderID)
	return err
}
