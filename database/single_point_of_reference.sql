INSERT INTO StockSnapshots (
    productId,
    warehouseId,
    snapshotDate,
    quantity,
    createdBy
)
SELECT
    cs.productId,
    cs.warehouseId,
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS snapshotDate,
    cs.currentquantity,
    NULL -- system user / service account
FROM vw_current_stock cs
ON CONFLICT (productId, warehouseId, snapshotDate)
DO NOTHING;
