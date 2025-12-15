CREATE OR REPLACE VIEW vw_current_stock AS
WITH last_snapshot AS (
    SELECT
        ss.productId,
        ss.warehouseId,
        ss.quantity,
        ss.snapshotDate,
        ROW_NUMBER() OVER (
            PARTITION BY ss.productId, ss.warehouseId
            ORDER BY ss.snapshotDate DESC
        ) AS rn
    FROM StockSnapshots ss
),

base_stock AS (
    SELECT
        productId,
        warehouseId,
        quantity AS base_quantity,
        snapshotDate
    FROM last_snapshot
    WHERE rn = 1
),

supplier_in AS (
    SELECT
        soi.productId,
        soi.warehouseId,
        SUM(soi.receivedQty) AS qty_in
    FROM SupplierOrderItems soi
    JOIN SupplierOrders so
        ON so.orderId = soi.orderId
    JOIN base_stock bs
        ON bs.productId = soi.productId
       AND bs.warehouseId = soi.warehouseId
    WHERE so.actualReceiptDate > bs.snapshotDate
    GROUP BY soi.productId, soi.warehouseId
),

shipment_out AS (
    SELECT
        msi.productId,
        msi.warehouseId,
        SUM(msi.acceptedQty) AS qty_out
    FROM MpShipmentItems msi
    JOIN MpShipments ms
        ON ms.shipmentId = msi.shipmentId
    JOIN base_stock bs
        ON bs.productId = msi.productId
       AND bs.warehouseId = msi.warehouseId
    WHERE ms.acceptanceDate > bs.snapshotDate
    GROUP BY msi.productId, msi.warehouseId
),

inventory_adjustments AS (
    SELECT
        ii.productId,
        ii.warehouseId,
        SUM(ii.receiptQty - ii.writeOffQty) AS qty_adjust
    FROM InventoryItems ii
    JOIN Inventories i
        ON i.inventoryId = ii.inventoryId
    JOIN base_stock bs
        ON bs.productId = ii.productId
       AND bs.warehouseId = ii.warehouseId
    WHERE i.adjustmentDate > bs.snapshotDate
    GROUP BY ii.productId, ii.warehouseId
)

SELECT
    bs.productId,
    bs.warehouseId,
    bs.base_quantity
        + COALESCE(si.qty_in, 0)
        - COALESCE(so.qty_out, 0)
        + COALESCE(ia.qty_adjust, 0)
        AS current_quantity
FROM base_stock bs
LEFT JOIN supplier_in si
    ON si.productId = bs.productId
   AND si.warehouseId = bs.warehouseId
LEFT JOIN shipment_out so
    ON so.productId = bs.productId
   AND so.warehouseId = bs.warehouseId
LEFT JOIN inventory_adjustments ia
    ON ia.productId = bs.productId
   AND ia.warehouseId = bs.warehouseId;
