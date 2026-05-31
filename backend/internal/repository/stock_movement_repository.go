package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StockMovementType string

const (
	StockMovementTypeAll                 StockMovementType = "all"
	StockMovementTypeSupplierReceipt     StockMovementType = "SUPPLIER_RECEIPT"
	StockMovementTypeMPShipmentOut       StockMovementType = "MP_SHIPMENT_OUT"
	StockMovementTypeMPShipmentIn        StockMovementType = "MP_SHIPMENT_IN"
	StockMovementTypeInventoryAdjustment StockMovementType = "INVENTORY_ADJUSTMENT"
)

type StockMovementRow struct {
	MovementDate    time.Time
	Quantity        int
	MovementType    string
	DocumentID      uuid.UUID
	DocumentNumber  string
	ProductID       uuid.UUID
	ProductArticle  string
	ProductBarcode  string
	WarehouseID     uuid.UUID
	WarehouseName   string
	IsMarketplaceWH bool
}

type StockMovementSummary struct {
	TotalRows int64
	TotalIn   int64
	TotalOut  int64
}

type StockMovementRepository struct {
	pool *pgxpool.Pool
}

func NewStockMovementRepository(pool *pgxpool.Pool) *StockMovementRepository {
	return &StockMovementRepository{pool: pool}
}

const stockMovementFrom = `
FROM vw_stock_movements m
JOIN products p ON p.product_id = m.product_id
JOIN warehouses w ON w.warehouse_id = m.warehouse_id
LEFT JOIN supplier_orders so
    ON m.movement_type = 'SUPPLIER_RECEIPT' AND so.order_id = m.document_id
LEFT JOIN mp_shipments ms
    ON m.movement_type IN ('MP_SHIPMENT_OUT', 'MP_SHIPMENT_IN') AND ms.shipment_id = m.document_id
LEFT JOIN inventories inv
    ON m.movement_type = 'INVENTORY_ADJUSTMENT' AND inv.inventory_id = m.document_id`

func (r *StockMovementRepository) buildWhere(
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	movementType StockMovementType,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
) (string, []any, int) {
	where := " WHERE 1=1"
	args := []any{}
	n := 1

	if warehouseID != nil {
		where += fmt.Sprintf(" AND m.warehouse_id = $%d", n)
		args = append(args, *warehouseID)
		n++
	}
	if productID != nil {
		where += fmt.Sprintf(" AND m.product_id = $%d", n)
		args = append(args, *productID)
		n++
	}
	if movementType != StockMovementTypeAll && movementType != "" {
		where += fmt.Sprintf(" AND m.movement_type = $%d", n)
		args = append(args, string(movementType))
		n++
	}
	if q != nil && *q != "" {
		where += fmt.Sprintf(" AND (p.article ILIKE $%d OR p.barcode ILIKE $%d)", n, n)
		args = append(args, "%"+*q+"%")
		n++
	}
	if dateFrom != nil {
		where += fmt.Sprintf(" AND m.movement_date >= $%d", n)
		args = append(args, *dateFrom)
		n++
	}
	if dateTo != nil {
		where += fmt.Sprintf(" AND m.movement_date <= $%d", n)
		args = append(args, *dateTo)
		n++
	}
	if ownWarehousesOnly {
		where += " AND w.is_marketplace = false"
	}
	return where, args, n
}

func (r *StockMovementRepository) Summarize(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	movementType StockMovementType,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
) (StockMovementSummary, error) {
	where, args, _ := r.buildWhere(warehouseID, productID, movementType, q, dateFrom, dateTo, ownWarehousesOnly)
	query := `
SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(CASE WHEN m.quantity > 0 THEN m.quantity ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN m.quantity < 0 THEN -m.quantity ELSE 0 END), 0)::bigint
` + stockMovementFrom + where

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var summary StockMovementSummary
	err := r.pool.QueryRow(ctx, query, args...).Scan(&summary.TotalRows, &summary.TotalIn, &summary.TotalOut)
	return summary, err
}

func (r *StockMovementRepository) List(
	ctx context.Context,
	warehouseID *uuid.UUID,
	productID *uuid.UUID,
	movementType StockMovementType,
	q *string,
	dateFrom *time.Time,
	dateTo *time.Time,
	ownWarehousesOnly bool,
	limit int,
	offset int,
) ([]StockMovementRow, error) {
	where, args, argPos := r.buildWhere(warehouseID, productID, movementType, q, dateFrom, dateTo, ownWarehousesOnly)
	query := `
SELECT
    m.movement_date,
    m.quantity,
    m.movement_type,
    m.document_id,
    COALESCE(so.order_number, ms.shipment_number, inv.notes, '') AS document_number,
    m.product_id,
    COALESCE(p.article, '') AS product_article,
    COALESCE(p.barcode, '') AS product_barcode,
    m.warehouse_id,
    COALESCE(w.name, '') AS warehouse_name,
    w.is_marketplace
` + stockMovementFrom + where + `
ORDER BY m.movement_date DESC, m.product_id, m.warehouse_id, m.movement_type, m.document_id
LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)
	args = append(args, limit, offset)

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []StockMovementRow
	for rows.Next() {
		var row StockMovementRow
		if err := rows.Scan(
			&row.MovementDate,
			&row.Quantity,
			&row.MovementType,
			&row.DocumentID,
			&row.DocumentNumber,
			&row.ProductID,
			&row.ProductArticle,
			&row.ProductBarcode,
			&row.WarehouseID,
			&row.WarehouseName,
			&row.IsMarketplaceWH,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
