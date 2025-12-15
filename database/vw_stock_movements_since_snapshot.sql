CREATE OR REPLACE VIEW vw_stock_movements_since_snapshot AS
WITH last_snapshot AS (
    SELECT
        ss.productId,
        ss.warehouseId,
        ss.snapshotDate,
        ss.quantity,
        ROW_NUMBER() OVER (
            PARTITION BY ss.productId, ss.warehouseId
            ORDER BY ss.snapshotDate DESC
        ) AS rn
    FROM StockSnapshots ss
)

SELECT
    m.productId,
    m.warehouseId,
    m.movementDate,
    m.quantity,
    m.movementType,
    m.documentId
FROM vw_stock_movements m
JOIN last_snapshot ls
    ON ls.productId = m.productId
   AND ls.warehouseId = m.warehouseId
WHERE ls.rn = 1
  AND m.movementDate > ls.snapshotDate;
