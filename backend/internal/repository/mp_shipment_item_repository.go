package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrMpShipmentItemNotFound = errors.New("mp shipment item not found")
	ErrMpShipmentItemExists   = errors.New("mp shipment item already exists")
)

type MpShipmentItem struct {
	ShipmentItemID   int
	ShipmentID       int
	ProductID        int
	WarehouseID      int
	SentQty          int
	AcceptedQty      int
	LogisticsForItem *float64
}

type MpShipmentItemRepository struct {
	pool *pgxpool.Pool
}

func NewMpShipmentItemRepository(pool *pgxpool.Pool) *MpShipmentItemRepository {
	return &MpShipmentItemRepository{pool: pool}
}

func (r *MpShipmentItemRepository) GetByID(ctx context.Context, itemID int) (*MpShipmentItem, error) {
	query := `
		SELECT shipment_item_id, shipment_id, product_id, warehouse_id,
		       sent_qty, accepted_qty, logistics_for_item
		FROM mp_shipment_items
		WHERE shipment_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item MpShipmentItem
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&item.ShipmentItemID,
		&item.ShipmentID,
		&item.ProductID,
		&item.WarehouseID,
		&item.SentQty,
		&item.AcceptedQty,
		&item.LogisticsForItem,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMpShipmentItemNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *MpShipmentItemRepository) GetByShipmentID(ctx context.Context, shipmentID int) ([]MpShipmentItem, error) {
	query := `
		SELECT shipment_item_id, shipment_id, product_id, warehouse_id,
		       sent_qty, accepted_qty, logistics_for_item
		FROM mp_shipment_items
		WHERE shipment_id = $1
		ORDER BY shipment_item_id
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []MpShipmentItem
	for rows.Next() {
		var item MpShipmentItem
		if err := rows.Scan(
			&item.ShipmentItemID,
			&item.ShipmentID,
			&item.ProductID,
			&item.WarehouseID,
			&item.SentQty,
			&item.AcceptedQty,
			&item.LogisticsForItem,
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

func (r *MpShipmentItemRepository) Create(ctx context.Context, shipmentID, productID, warehouseID, sentQty, acceptedQty int, logisticsForItem *float64) (*MpShipmentItem, error) {
	query := `
		INSERT INTO mp_shipment_items (
			shipment_id, product_id, warehouse_id, sent_qty, accepted_qty, logistics_for_item
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING shipment_item_id, shipment_id, product_id, warehouse_id,
		          sent_qty, accepted_qty, logistics_for_item
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item MpShipmentItem
	err := r.pool.QueryRow(ctx, query,
		shipmentID, productID, warehouseID, sentQty, acceptedQty, logisticsForItem,
	).Scan(
		&item.ShipmentItemID,
		&item.ShipmentID,
		&item.ProductID,
		&item.WarehouseID,
		&item.SentQty,
		&item.AcceptedQty,
		&item.LogisticsForItem,
	)

	if err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *MpShipmentItemRepository) Update(ctx context.Context, itemID, shipmentID, productID, warehouseID, sentQty, acceptedQty int, logisticsForItem *float64) (*MpShipmentItem, error) {
	query := `
		UPDATE mp_shipment_items
		SET shipment_id = $1, product_id = $2, warehouse_id = $3,
		    sent_qty = $4, accepted_qty = $5, logistics_for_item = $6
		WHERE shipment_item_id = $7
		RETURNING shipment_item_id, shipment_id, product_id, warehouse_id,
		          sent_qty, accepted_qty, logistics_for_item
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var item MpShipmentItem
	err := r.pool.QueryRow(ctx, query,
		shipmentID, productID, warehouseID, sentQty, acceptedQty, logisticsForItem, itemID,
	).Scan(
		&item.ShipmentItemID,
		&item.ShipmentID,
		&item.ProductID,
		&item.WarehouseID,
		&item.SentQty,
		&item.AcceptedQty,
		&item.LogisticsForItem,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMpShipmentItemNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *MpShipmentItemRepository) Delete(ctx context.Context, itemID int) error {
	query := `
		DELETE FROM mp_shipment_items
		WHERE shipment_item_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, itemID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMpShipmentItemNotFound
	}

	return nil
}
