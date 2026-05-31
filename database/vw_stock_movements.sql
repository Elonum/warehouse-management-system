CREATE OR REPLACE VIEW vw_stock_movements AS

-- 1. Приход от поставщиков (финальные заказы)
SELECT
    soi.product_id,
    soi.warehouse_id,
    so.actual_receipt_date AS movement_date,
    soi.received_qty AS quantity,
    'SUPPLIER_RECEIPT'::text AS movement_type,
    so.order_id AS document_id
FROM supplier_order_items soi
JOIN supplier_orders so
    ON so.order_id = soi.order_id
JOIN order_statuses os
    ON os.order_status_id = so.status_id
WHERE so.actual_receipt_date IS NOT NULL
  AND os.is_final = true
  AND soi.received_qty <> 0

UNION ALL

-- 2. Отгрузка на маркетплейсы: списание с основного склада
SELECT
    msi.product_id,
    ms.main_warehouse_id AS warehouse_id,
    ms.acceptance_date AS movement_date,
    -msi.accepted_qty AS quantity,
    'MP_SHIPMENT_OUT'::text AS movement_type,
    ms.shipment_id AS document_id
FROM mp_shipment_items msi
JOIN mp_shipments ms
    ON ms.shipment_id = msi.shipment_id
JOIN shipment_statuses ss
    ON ss.shipment_status_id = ms.status_id
WHERE ms.acceptance_date IS NOT NULL
  AND ss.is_final = true
  AND ms.main_warehouse_id IS NOT NULL
  AND msi.accepted_qty <> 0

UNION ALL

-- 3. Отгрузка на маркетплейсы: приход на склад маркетплейса
SELECT
    msi.product_id,
    ms.mp_warehouse_id AS warehouse_id,
    ms.acceptance_date AS movement_date,
    msi.accepted_qty AS quantity,
    'MP_SHIPMENT_IN'::text AS movement_type,
    ms.shipment_id AS document_id
FROM mp_shipment_items msi
JOIN mp_shipments ms
    ON ms.shipment_id = msi.shipment_id
JOIN shipment_statuses ss
    ON ss.shipment_status_id = ms.status_id
WHERE ms.acceptance_date IS NOT NULL
  AND ss.is_final = true
  AND ms.mp_warehouse_id IS NOT NULL
  AND msi.accepted_qty <> 0

UNION ALL

-- 4. Инвентаризация (финальные документы)
SELECT
    ii.product_id,
    ii.warehouse_id,
    i.adjustment_date AS movement_date,
    (ii.receipt_qty - ii.write_off_qty) AS quantity,
    'INVENTORY_ADJUSTMENT'::text AS movement_type,
    i.inventory_id AS document_id
FROM inventory_items ii
JOIN inventories i
    ON i.inventory_id = ii.inventory_id
JOIN inventory_statuses ist
    ON ist.inventory_status_id = i.status_id
WHERE i.adjustment_date IS NOT NULL
  AND ist.is_final = true
  AND (ii.receipt_qty - ii.write_off_qty) <> 0;
