INSERT INTO stock_snapshots (
    product_id,
    warehouse_id,
    snapshot_date,
    quantity,
    created_by
)
SELECT
    cs.product_id,
    cs.warehouse_id,
    date_trunc('month', current_date) - INTERVAL '1 day' AS snapshot_date,
    cs.current_quantity,
    NULL -- system user / service account
FROM vw_current_stock cs
ON CONFLICT (product_id, warehouse_id, snapshot_date)
DO NOTHING;