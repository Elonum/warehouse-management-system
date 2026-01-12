BEGIN;

-- =========================
-- 1. Роли пользователей
-- =========================
INSERT INTO user_roles (name) VALUES
('admin'),
('purchasing_manager'),
('logistician'),
('accountant');

-- =========================
-- 2. Пользователи
-- =========================
INSERT INTO users (email, name, surname, patronymic, password_hash, role_id) VALUES
('admin@senseone.ru', 'Иван', 'Иванов', 'Иванович', 'hash_admin', 1),
('buyer@senseone.ru', 'Анна', 'Смирнова', 'Олеговна', 'hash_buyer', 2),
('logist@senseone.ru', 'Дмитрий', 'Кузнецов', 'Алексеевич', 'hash_logist', 3),
('accountant@senseone.ru', 'Мария', 'Петрова', 'Сергеевна', 'hash_accountant', 4);

-- =========================
-- 3. Типы складов
-- =========================
INSERT INTO warehouse_types (name) VALUES
('Основной склад'),
('Фулфилмент'),
('Транзитный склад');

-- =========================
-- 4. Магазины / маркетплейсы
-- =========================
INSERT INTO stores (name) VALUES
('InnoGoods'),
('InnoBra');

-- =========================
-- 5. Склады
-- =========================
INSERT INTO warehouses (name, warehouse_type_id, location) VALUES
('Склад Казань', 1, 'г. Казань'),
('Склад Москва', 2, 'г. Москва'),
('Склад Китай', 3, 'г. Шэньчжэнь');

-- =========================
-- 6. Товары
-- =========================
INSERT INTO products (article, barcode, unit_weight, unit_cost) VALUES
('ING-001', '460000000001', 500, 350.00),
('ING-002', '460000000002', 700, 520.00),
('ING-003', '460000000003', 300, 210.00);

-- =========================
-- 7. Статусы заказов
-- =========================
INSERT INTO order_statuses (name) VALUES
('Создан'),
('В пути'),
('Принят'),
('Закрыт');

-- =========================
-- 8. Заказы поставщикам
-- =========================
INSERT INTO supplier_orders (
    order_number, buyer, status_id,
    purchase_date, planned_receipt_date, actual_receipt_date,
    logistics_china_msk, logistics_msk_kzn, logistics_additional, logistics_total,
    order_item_cost, positions_qty, total_qty, order_item_weight,
    created_by
) VALUES
(
    'SO-001', 'SENSE ONE', 3,
    '2025-01-10', '2025-02-01', '2025-02-05',
    12000, 4000, 1000, 17000,
    45000, 2, 150, 120,
    2
);

-- =========================
-- 9. Позиции заказов поставщика
-- =========================
INSERT INTO supplier_order_items (
    order_id, product_id, warehouse_id,
    ordered_qty, received_qty, purchase_price,
    total_price, total_weight,
    total_logistics, unit_logistics,
    unit_self_cost, total_self_cost,
    fulfillment_cost
) VALUES
(1, 1, 1, 100, 100, 300, 30000, 50, 8000, 80, 380, 38000, 15),
(1, 2, 1, 50, 50, 400, 20000, 35, 9000, 180, 580, 29000, 20);

-- =========================
-- 10. Документы по заказам
-- =========================
INSERT INTO supplier_order_documents (order_id, name, description, file_path) VALUES
(1, 'invoice.pdf', 'Инвойс от поставщика', '/docs/invoice_so_001.pdf'),
(1, 'packing_list.pdf', 'Упаковочный лист', '/docs/packing_so_001.pdf');

-- =========================
-- 11. Статусы отгрузок
-- =========================
INSERT INTO shipment_statuses (name) VALUES
('Подготовлено'),
('Отправлено'),
('Принято');

-- =========================
-- 12. Отгрузки на маркетплейсы
-- =========================
INSERT INTO mp_shipments (
    shipment_date, shipment_number,
    store_id, warehouse_id, status_id,
    logistics_cost, unit_logistics,
    acceptance_cost, acceptance_date,
    positions_qty, sent_qty, accepted_qty,
    created_by
) VALUES
(
    '2025-02-10', 'MP-001',
    1, 1, 3,
    6000, 60,
    1500, '2025-02-12',
    2, 120, 115,
    3
);

-- =========================
-- 13. Позиции отгрузок
-- =========================
INSERT INTO mp_shipment_items (
    shipment_id, product_id, warehouse_id,
    sent_qty, accepted_qty, logistics_for_item
) VALUES
(1, 1, 1, 80, 78, 4000),
(1, 2, 1, 40, 37, 2000);

-- =========================
-- 14. Статусы инвентаризации
-- =========================
INSERT INTO inventory_statuses (name) VALUES
('Создана'),
('Завершена');

-- =========================
-- 15. Инвентаризации
-- =========================
INSERT INTO inventories (
    adjustment_date, status_id, notes, created_by
) VALUES
('2025-02-15', 2, 'Плановая инвентаризация', 4);

-- =========================
-- 16. Позиции инвентаризации
-- =========================
INSERT INTO inventory_items (
    inventory_id, product_id, warehouse_id,
    receipt_qty, write_off_qty, reason
) VALUES
(1, 1, 1, 2, 0, 'Излишек'),
(1, 2, 1, 0, 1, 'Брак');

-- =========================
-- 17. Себестоимость по периодам
-- =========================
INSERT INTO product_costs (
    product_id, period_start, period_end,
    unit_cost_to_warehouse, notes, created_by
) VALUES
(1, '2025-02-01', '2025-02-28', 380, 'Партия февраль', 4),
(2, '2025-02-01', '2025-02-28', 580, 'Партия февраль', 4),
(3, '2025-02-01', '2025-02-28', 230, 'Партия февраль', 4);

-- =========================
-- 18. Снапшоты остатков
-- =========================
INSERT INTO stock_snapshots (
    product_id, warehouse_id,
    snapshot_date, quantity, created_by
) VALUES
(1, 1, '2025-01-31', 100, 1),
(2, 1, '2025-01-31', 50, 1),
(3, 1, '2025-01-31', 0, 1);

COMMIT;
