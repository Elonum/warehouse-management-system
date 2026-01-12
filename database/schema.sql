-- ===== Роли и пользователи =====

CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    surname VARCHAR(100),
    patronymic VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES user_roles(role_id)
);

-- ===== Справочники =====

CREATE TABLE IF NOT EXISTS warehouse_types (
    warehouse_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
    store_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    warehouse_type_id INTEGER REFERENCES warehouse_types(warehouse_type_id),
    location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    article VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    unit_weight INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2)
);

-- ===== Заказы поставщикам =====

CREATE TABLE IF NOT EXISTS order_statuses (
    order_status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_orders (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer VARCHAR(100),
    status_id INTEGER REFERENCES order_statuses(order_status_id),
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
    parent_order_id INTEGER REFERENCES supplier_orders(order_id),
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
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
    document_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL
);

-- ===== Отгрузки на маркетплейсы =====

CREATE TABLE IF NOT EXISTS shipment_statuses (
    shipment_status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS mp_shipments (
    shipment_id SERIAL PRIMARY KEY,
    shipment_date DATE,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    store_id INTEGER REFERENCES stores(store_id),
    warehouse_id INTEGER REFERENCES warehouses(warehouse_id),
    status_id INTEGER REFERENCES shipment_statuses(shipment_status_id),
    logistics_cost DECIMAL(10,2),
    unit_logistics DECIMAL(10,2),
    acceptance_cost DECIMAL(10,2),
    acceptance_date DATE,
    positions_qty INTEGER NOT NULL DEFAULT 0,
    sent_qty INTEGER NOT NULL DEFAULT 0,
    accepted_qty INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mp_shipment_items (
    shipment_item_id SERIAL PRIMARY KEY,
    shipment_id INTEGER REFERENCES mp_shipments(shipment_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
    sent_qty INTEGER NOT NULL DEFAULT 0,
    accepted_qty INTEGER NOT NULL DEFAULT 0,
    logistics_for_item DECIMAL(10,2)
);

-- ===== Инвентаризация =====

CREATE TABLE IF NOT EXISTS inventory_statuses (
    inventory_status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS inventories (
    inventory_id SERIAL PRIMARY KEY,
    adjustment_date DATE,
    status_id INTEGER REFERENCES inventory_statuses(inventory_status_id),
    notes VARCHAR(255),
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_item_id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
    receipt_qty INTEGER NOT NULL DEFAULT 0,
    write_off_qty INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(255)
);

-- ===== Себестоимость и снапшоты =====

CREATE TABLE IF NOT EXISTS product_costs (
    cost_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    unit_cost_to_warehouse DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255),
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
    snapshot_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, warehouse_id, snapshot_date)
);

-- ===== Индексы =====

CREATE INDEX idx_users_role ON users(role_id);

CREATE INDEX idx_supplier_orders_status ON supplier_orders(status_id);
CREATE INDEX idx_supplier_orders_parent ON supplier_orders(parent_order_id);
CREATE INDEX idx_supplier_orders_receipt_date ON supplier_orders(actual_receipt_date);

CREATE INDEX idx_supplier_order_items_order ON supplier_order_items(order_id);
CREATE INDEX idx_supplier_order_items_product ON supplier_order_items(product_id);
CREATE INDEX idx_supplier_order_items_stock
ON supplier_order_items (product_id, warehouse_id);

CREATE INDEX idx_supplier_order_docs_order
ON supplier_order_documents(order_id);

CREATE INDEX idx_mp_shipments_store ON mp_shipments(store_id);
CREATE INDEX idx_mp_shipments_warehouse ON mp_shipments(warehouse_id);
CREATE INDEX idx_mp_shipments_status ON mp_shipments(status_id);

CREATE INDEX idx_mp_shipment_items_shipment ON mp_shipment_items(shipment_id);
CREATE INDEX idx_mp_shipment_items_product ON mp_shipment_items(product_id);
CREATE INDEX idx_mp_shipment_items_stock
ON mp_shipment_items (product_id, warehouse_id);

CREATE INDEX idx_inventories_status ON inventories(status_id);

CREATE INDEX idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_items_stock
ON inventory_items (product_id, warehouse_id);

CREATE INDEX idx_product_costs_product_period
ON product_costs (product_id, period_start);