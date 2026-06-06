-- ===== Полная очистка данных (структура таблиц сохраняется) =====
-- Запуск перед повторной загрузкой test_values.sql:
--   psql -d warehouse -f database/clear_all_data.sql
--   psql -d warehouse -f database/test_values.sql

SET session_replication_role = 'replica';

DELETE FROM stock_snapshots;
DELETE FROM product_costs;
DELETE FROM inventory_items;
DELETE FROM inventories;
DELETE FROM mp_shipment_items;
DELETE FROM mp_shipments;
DELETE FROM supplier_order_documents;
DELETE FROM supplier_order_items;
DELETE FROM supplier_orders;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM warehouses;
DELETE FROM password_reset_tokens;
DELETE FROM users;
DELETE FROM inventory_statuses;
DELETE FROM shipment_statuses;
DELETE FROM order_statuses;
DELETE FROM stores;
DELETE FROM user_roles;

SET session_replication_role = 'origin';

DO $$
BEGIN
    RAISE NOTICE 'Все данные удалены. Загрузите test_values.sql для демо-набора.';
END $$;
