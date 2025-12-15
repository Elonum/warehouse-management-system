CREATE OR REPLACE VIEW vw_stock_movements AS

-- 1. Приход от поставщиков
SELECT
    soi.productId,
    soi.warehouseId,
    so.actualReceiptDate AS movementDate,
    soi.receivedQty AS quantity,
    'SUPPLIER_RECEIPT' AS movementType,
    so.orderId AS documentId
FROM SupplierOrderItems soi
JOIN SupplierOrders so
    ON so.orderId = soi.orderId
WHERE so.actualReceiptDate IS NOT NULL


UNION ALL

-- 2. Отгрузка на маркетплейсы
SELECT
    msi.productId,
    msi.warehouseId,
    ms.acceptanceDate AS movementDate,
    -msi.acceptedQty AS quantity,
    'MP_SHIPMENT' AS movementType,
    ms.shipmentId AS documentId
FROM MpShipmentItems msi
JOIN MpShipments ms
    ON ms.shipmentId = msi.shipmentId
WHERE ms.acceptanceDate IS NOT NULL


UNION ALL

-- 3. Инвентаризация
SELECT
    ii.productId,
    ii.warehouseId,
    i.adjustmentDate AS movementDate,
    (ii.receiptQty - ii.writeOffQty) AS quantity,
    'INVENTORY_ADJUSTMENT' AS movementType,
    i.inventoryId AS documentId
FROM InventoryItems ii
JOIN Inventories i
    ON i.inventoryId = ii.inventoryId
WHERE i.adjustmentDate IS NOT NULL;
