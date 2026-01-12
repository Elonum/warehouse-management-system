CREATE OR REPLACE VIEW vw_stock_movements AS

-- 1. Приход от поставщиков
SELECT
    soi.product_id,
    soi.warehouse_id,
    so.actual_receipt_date AS movement_date,
    soi.received_qty AS quantity,
    'SUPPLIER_RECEIPT' AS movement_type,
    so.order_id AS document_id
FROM supplier_order_items soi
JOIN supplier_orders so
    ON so.order_id = soi.order_id
WHERE so.actual_receipt_date IS NOT NULL

UNION ALL

-- 2. Отгрузка на маркетплейсы
SELECT
    msi.product_id,
    msi.warehouse_id,
    ms.acceptance_date AS movement_date,
    -msi.accepted_qty AS quantity,
    'MP_SHIPMENT' AS movement_type,
    ms.shipment_id AS document_id
FROM mp_shipment_items msi
JOIN mp_shipments ms
    ON ms.shipment_id = msi.shipment_id
WHERE ms.acceptance_date IS NOT NULL

UNION ALL

-- 3. Инвентаризация
SELECT
    ii.product_id,
    ii.warehouse_id,
    i.adjustment_date AS movement_date,
    (ii.receipt_qty - ii.write_off_qty) AS quantity,
    'INVENTORY_ADJUSTMENT' AS movement_type,
    i.inventory_id AS document_id
FROM inventory_items ii
JOIN inventories i
    ON i.inventory_id = ii.inventory_id
WHERE i.adjustment_date IS NOT NULL;