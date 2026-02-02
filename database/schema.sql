-- =====================================================
-- Включение UUID
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Роли и пользователи
-- =====================================================

CREATE TABLE IF NOT EXISTS user_roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    surname VARCHAR(100),
    patronymic VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES user_roles(role_id)
);

-- =====================================================
-- Справочники
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_types (
    warehouse_type_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
    store_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    warehouse_type_id UUID REFERENCES warehouse_types(warehouse_type_id),
    location VARCHAR(100)
);

-- =====================================================
-- Товары
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    unit_weight INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2),
    purchase_price DECIMAL(10,2),
    processing_price DECIMAL(10,2)
);

-- =====================================================
-- Изображения товаров
-- =====================================================

CREATE TABLE IF NOT EXISTS product_images (
    image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product
    ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_order
    ON product_images(product_id, display_order);

-- =====================================================
-- Статусы заказов поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS order_statuses (
    order_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer VARCHAR(100),
    status_id UUID REFERENCES order_statuses(order_status_id),
    purchase_date DATE,
    planned_receipt_date DATE,
    actual_receipt_date DATE,
    logistics_china_msk DECIMAL(10,2),
    logistics_msk_kzn DECIMAL(10,2),
    logistics_additional DECIMAL(10,2),
    logistics_total DECIMAL(10,2),
    order_item_cost DECIMAL(10,2),
    positions_qty INTEGER NOT NULL DEFAULT 0,
    total_qty INTEGER NOT NULL DEFAULT 0,
    order_item_weight DECIMAL(10,2),
    parent_order_id UUID REFERENCES supplier_orders(order_id),
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    ordered_qty INTEGER NOT NULL DEFAULT 0,
    received_qty INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    total_weight INTEGER NOT NULL DEFAULT 0,
    total_logistics DECIMAL(10,2),
    unit_logistics DECIMAL(10,2),
    unit_self_cost DECIMAL(10,2),
    total_self_cost DECIMAL(10,2),
    fulfillment_cost DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS supplier_order_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL
);

-- =====================================================
-- Отгрузки
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_statuses (
    shipment_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS mp_shipments (
    shipment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_date DATE,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    store_id UUID REFERENCES stores(store_id),
    warehouse_id UUID REFERENCES warehouses(warehouse_id),
    status_id UUID REFERENCES shipment_statuses(shipment_status_id),
    logistics_cost DECIMAL(10,2),
    unit_logistics DECIMAL(10,2),
    acceptance_cost DECIMAL(10,2),
    acceptance_date DATE,
    positions_qty INTEGER NOT NULL DEFAULT 0,
    sent_qty INTEGER NOT NULL DEFAULT 0,
    accepted_qty INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mp_shipment_items (
    shipment_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES mp_shipments(shipment_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    sent_qty INTEGER NOT NULL DEFAULT 0,
    accepted_qty INTEGER NOT NULL DEFAULT 0,
    logistics_for_item DECIMAL(10,2)
);

-- =====================================================
-- Инвентаризация
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_statuses (
    inventory_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS inventories (
    inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_date DATE,
    status_id UUID NOT NULL REFERENCES inventory_statuses(inventory_status_id),
    notes VARCHAR(255),
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    receipt_qty INTEGER NOT NULL DEFAULT 0,
    write_off_qty INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(255)
);

-- =====================================================
-- Себестоимость и снапшоты
-- =====================================================

CREATE TABLE IF NOT EXISTS product_costs (
    cost_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(product_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    unit_cost_to_warehouse DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255),
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(product_id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id),
    snapshot_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, warehouse_id, snapshot_date)
);

-- =====================================================
-- Индексы
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_parent ON supplier_orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_receipt_date ON supplier_orders(actual_receipt_date);

CREATE INDEX IF NOT EXISTS idx_supplier_order_items_order ON supplier_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_product ON supplier_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_stock ON supplier_order_items(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_supplier_order_docs_order ON supplier_order_documents(order_id);

CREATE INDEX IF NOT EXISTS idx_mp_shipments_store ON mp_shipments(store_id);
CREATE INDEX IF NOT EXISTS idx_mp_shipments_warehouse ON mp_shipments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_mp_shipments_status ON mp_shipments(status_id);

CREATE INDEX IF NOT EXISTS idx_mp_shipment_items_shipment ON mp_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_mp_shipment_items_product ON mp_shipment_items(product_id);
CREATE INDEX IF NOT EXISTS idx_mp_shipment_items_stock ON mp_shipment_items(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_product_costs_product_period
    ON product_costs(product_id, period_start);