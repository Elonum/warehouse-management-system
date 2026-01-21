-- ===== Скрипт для полной очистки всех данных из базы данных =====
-- ВНИМАНИЕ: Этот скрипт удаляет ВСЕ данные из всех таблиц, но сохраняет структуру таблиц

-- Отключаем проверку внешних ключей
SET session_replication_role = 'replica';

-- ===== Удаление данных из таблиц с зависимостями (дочерние таблицы) =====

-- Снапшоты остатков (зависит от products, warehouses, users)
DELETE FROM stock_snapshots;

-- Себестоимость продуктов (зависит от products, users)
DELETE FROM product_costs;

-- Элементы инвентаризации (зависит от inventories, products, warehouses)
DELETE FROM inventory_items;

-- Инвентаризации (зависит от inventory_statuses, users)
DELETE FROM inventories;

-- Элементы отгрузок на маркетплейсы (зависит от mp_shipments, products, warehouses)
DELETE FROM mp_shipment_items;

-- Отгрузки на маркетплейсы (зависит от stores, warehouses, shipment_statuses, users)
DELETE FROM mp_shipments;

-- Документы заказов поставщиков (зависит от supplier_orders)
DELETE FROM supplier_order_documents;

-- Элементы заказов поставщиков (зависит от supplier_orders, products, warehouses)
DELETE FROM supplier_order_items;

-- Заказы поставщиков (зависит от order_statuses, users)
DELETE FROM supplier_orders;

-- ===== Удаление данных из основных таблиц =====

-- Продукты (независимая таблица, но на неё ссылаются другие)
DELETE FROM products;

-- Склады (зависит от warehouse_types)
DELETE FROM warehouses;

-- Пользователи (зависит от user_roles)
DELETE FROM users;

-- ===== Удаление данных из справочников =====

-- Статусы инвентаризации
DELETE FROM inventory_statuses;

-- Статусы отгрузок
DELETE FROM shipment_statuses;

-- Статусы заказов
DELETE FROM order_statuses;

-- Магазины (маркетплейсы)
DELETE FROM stores;

-- Типы складов
DELETE FROM warehouse_types;

-- Роли пользователей (должна быть последней, так как на неё ссылаются users)
DELETE FROM user_roles;

-- Включаем обратно проверку внешних ключей
SET session_replication_role = 'origin';

-- Вывод сообщения об успешном завершении
DO $$
BEGIN
    RAISE NOTICE 'Все данные успешно удалены. Структура таблиц сохранена.';
END $$;

