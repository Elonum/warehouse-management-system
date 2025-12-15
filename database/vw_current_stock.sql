CREATE OR REPLACE VIEW vw_current_stock AS
WITH last_snapshots AS (
    SELECT
        ss.productId,
        ss.warehouseId,
        ss.snapshotDate,
        ss.quantity
    FROM StockSnapshots ss
    INNER JOIN (
        SELECT
            productId,
            warehouseId,
            MAX(snapshotDate) AS maxDate
        FROM StockSnapshots
        GROUP BY productId, warehouseId
    ) latest
        ON ss.productId = latest.productId
       AND ss.warehouseId = latest.warehouseId
       AND ss.snapshotDate = latest.maxDate
),

-- Приходы от поставщиков
supplier_receipts AS (
    SELECT
        soi.productId,
        soi.warehouseId,
        SUM(soi.receivedQty) AS qty
    FROM SupplierOrderItems soi
    JOIN SupplierOrders so
        ON so.orderId = soi.orderId
    JOIN last_snapshots ls
        ON ls.productId = soi.productId
       AND ls.warehouseId = soi.warehouseId
    WHERE so.actualReceiptDate > ls.snapshotDate
    GROUP BY soi.productId, soi.warehouseId
),

-- Расходы на маркетплейсы
shipment_expenses AS (
    SELECT
        msi.productId,
        msi.warehouseId,
        SUM(msi.acceptedQty) AS qty
    FROM MpShipmentItems msi
    JOIN MpShipments ms
        ON ms.shipmentId = msi.shipmentId
    JOIN last_snapshots ls
        ON ls.productId = msi.productId
       AND ls.warehouseId = msi.warehouseId
    WHERE ms.acceptanceDate > ls.snapshotDate
    GROUP BY msi.productId, msi.warehouseId
),

-- Инвентаризация
inventory_adjustments AS (
    SELECT
        ii.productId,
        ii.warehouseId,
        SUM(ii.receiptQty) AS receiptQty,
        SUM(ii.writeOffQty) AS writeOffQty
    FROM InventoryItems ii
    JOIN Inventories i
        ON i.inventoryId = ii.inventoryId
    JOIN last_snapshots ls
        ON ls.productId = ii.productId
       AND ls.warehouseId = ii.warehouseId
    WHERE i.adjustmentDate > ls.snapshotDate
    GROUP BY ii.productId, ii.warehouseId
)

SELECT
    ls.productId,
    ls.warehouseId,
    ls.snapshotDate,
    ls.quantity
        + COALESCE(sr.qty, 0)
        + COALESCE(ia.receiptQty, 0)
        - COALESCE(se.qty, 0)
        - COALESCE(ia.writeOffQty, 0)
        AS currentQuantity
FROM last_snapshots ls
LEFT JOIN supplier_receipts sr
    ON sr.productId = ls.productId
   AND sr.warehouseId = ls.warehouseId
LEFT JOIN shipment_expenses se
    ON se.productId = ls.productId
   AND se.warehouseId = ls.warehouseId
LEFT JOIN inventory_adjustments ia
    ON ia.productId = ls.productId
   AND ia.warehouseId = ls.warehouseId;
