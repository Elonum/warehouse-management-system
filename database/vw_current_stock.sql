CREATE OR REPLACE VIEW vw_current_stock AS
WITH last_snapshot AS (
    SELECT
        ss.product_id,
        ss.warehouse_id,
        ss.quantity,
        ss.snapshot_date,
        ROW_NUMBER() OVER (
            PARTITION BY ss.product_id, ss.warehouse_id
            ORDER BY ss.snapshot_date DESC
        ) AS rn
    FROM stock_snapshots ss
),

base_stock AS (
    SELECT
        product_id,
        warehouse_id,
        quantity AS base_quantity,
        snapshot_date
    FROM last_snapshot
    WHERE rn = 1
),

supplier_in AS (
    SELECT
        soi.product_id,
        soi.warehouse_id,
        SUM(soi.received_qty) AS qty_in
    FROM supplier_order_items soi
    JOIN supplier_orders so
        ON so.order_id = soi.order_id
    JOIN base_stock bs
        ON bs.product_id = soi.product_id
       AND bs.warehouse_id = soi.warehouse_id
    WHERE so.actual_receipt_date > bs.snapshot_date
    GROUP BY soi.product_id, soi.warehouse_id
),

shipment_out AS (
    SELECT
        msi.product_id,
        ms.main_warehouse_id AS warehouse_id,
        SUM(msi.accepted_qty) AS qty_out
    FROM mp_shipment_items msi
    JOIN mp_shipments ms
        ON ms.shipment_id = msi.shipment_id
	    JOIN shipment_statuses ss
	        ON ss.shipment_status_id = ms.status_id
    JOIN base_stock bs
        ON bs.product_id = msi.product_id
       AND bs.warehouse_id = ms.main_warehouse_id
	    WHERE ss.is_final = true
	      AND ms.acceptance_date > bs.snapshot_date
          AND ms.main_warehouse_id IS NOT NULL
    GROUP BY msi.product_id, ms.main_warehouse_id
),

shipment_in AS (
    SELECT
        msi.product_id,
        ms.mp_warehouse_id AS warehouse_id,
        SUM(msi.accepted_qty) AS qty_in
    FROM mp_shipment_items msi
    JOIN mp_shipments ms
        ON ms.shipment_id = msi.shipment_id
    JOIN shipment_statuses ss
        ON ss.shipment_status_id = ms.status_id
    JOIN base_stock bs
        ON bs.product_id = msi.product_id
       AND bs.warehouse_id = ms.mp_warehouse_id
    WHERE ss.is_final = true
      AND ms.acceptance_date > bs.snapshot_date
      AND ms.mp_warehouse_id IS NOT NULL
    GROUP BY msi.product_id, ms.mp_warehouse_id
),

inventory_adjustments AS (
    SELECT
        ii.product_id,
        ii.warehouse_id,
        SUM(ii.receipt_qty - ii.write_off_qty) AS qty_adjust
    FROM inventory_items ii
    JOIN inventories i
        ON i.inventory_id = ii.inventory_id
    JOIN inventory_statuses ist
        ON ist.inventory_status_id = i.status_id
    JOIN base_stock bs
        ON bs.product_id = ii.product_id
       AND bs.warehouse_id = ii.warehouse_id
    WHERE i.adjustment_date > bs.snapshot_date
      AND ist.is_final = true  -- только финальные инвентаризации
    GROUP BY ii.product_id, ii.warehouse_id
)

SELECT
    bs.product_id,
    bs.warehouse_id,
    bs.base_quantity
        + COALESCE(si.qty_in, 0)
        + COALESCE(sin.qty_in, 0)
        - COALESCE(so.qty_out, 0)
        + COALESCE(ia.qty_adjust, 0)
        AS current_quantity
FROM base_stock bs
LEFT JOIN supplier_in si
    ON si.product_id = bs.product_id
   AND si.warehouse_id = bs.warehouse_id
LEFT JOIN shipment_in sin
    ON sin.product_id = bs.product_id
   AND sin.warehouse_id = bs.warehouse_id
LEFT JOIN shipment_out so
    ON so.product_id = bs.product_id
   AND so.warehouse_id = bs.warehouse_id
LEFT JOIN inventory_adjustments ia
    ON ia.product_id = bs.product_id
   AND ia.warehouse_id = bs.warehouse_id;