CREATE OR REPLACE VIEW vw_stock_movements_since_snapshot AS
WITH last_snapshot AS (
    SELECT
        ss.product_id,
        ss.warehouse_id,
        ss.snapshot_date,
        ss.quantity,
        ROW_NUMBER() OVER (
            PARTITION BY ss.product_id, ss.warehouse_id
            ORDER BY ss.snapshot_date DESC
        ) AS rn
    FROM stock_snapshots ss
)
SELECT
    m.product_id,
    m.warehouse_id,
    m.movement_date,
    m.quantity,
    m.movement_type,
    m.document_id
FROM vw_stock_movements m
JOIN last_snapshot ls
    ON ls.product_id = m.product_id
   AND ls.warehouse_id = m.warehouse_id
WHERE ls.rn = 1
  AND m.movement_date > ls.snapshot_date;