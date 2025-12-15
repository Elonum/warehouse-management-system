CREATE TABLE IF NOT EXISTS UserRoles (
    roleId SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Users (
    userId SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(100),
    surname VARCHAR(100),
    patronymic VARCHAR(100),
    passwordHash VARCHAR(255) NOT NULL,
    roleId INTEGER REFERENCES UserRoles(roleId)
);

CREATE TABLE IF NOT EXISTS WarehouseTypes (
    warehouseTypeId SERIAL PRIMARY KEY,
    "name" VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Stores (
    storeId SERIAL PRIMARY KEY,
    "name" VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Warehouses (
    warehouseId SERIAL PRIMARY KEY,
    "name" VARCHAR(100) UNIQUE NOT NULL,
	"type" INTEGER REFERENCES WarehouseTypes(warehouseTypeId),
    "location" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS Products (
    productId SERIAL PRIMARY KEY,
    article VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    unitWeight INTEGER NOT NULL DEFAULT 0,
    unitCost DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS OrderStatuses (
    orderStatusId SERIAL PRIMARY KEY,
    "name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS SupplierOrders (
    orderId SERIAL PRIMARY KEY,
    orderNumber VARCHAR(50) UNIQUE NOT NULL,
    buyer VARCHAR(100),
    statusId INTEGER REFERENCES OrderStatuses(orderStatusId),
    purchaseDate DATE,
    plannedReceiptDate DATE,
    actualReceiptDate DATE,
    logisticsChinaMsk DECIMAL(10,2),
    logisticsMskKzn DECIMAL(10,2),
	logisticsAdditional DECIMAL(10,2),
	logisticsTotal DECIMAL(10,2),
    orderItemCost DECIMAL(10,2),
    positionsQty INTEGER NOT NULL DEFAULT 0,
    totalQty INTEGER NOT NULL DEFAULT 0,
    orderItemWeight DECIMAL(10,2),
	parentOrderId INTEGER REFERENCES SupplierOrders(orderId),
    createdBy INTEGER REFERENCES Users(userId),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedBy INTEGER REFERENCES Users(userId),
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SupplierOrderItems (
    orderItemId SERIAL PRIMARY KEY,
    orderId INTEGER REFERENCES SupplierOrders(orderId) ON DELETE CASCADE,
    productId INTEGER REFERENCES Products(productId),
	warehouseId INTEGER NOT NULL REFERENCES Warehouses(warehouseId),
    orderedQty INTEGER NOT NULL DEFAULT 0,
    receivedQty INTEGER NOT NULL DEFAULT 0,
    purchasePrice DECIMAL(10,2),
	totalPrice DECIMAL(10,2),
    totalWeight INTEGER NOT NULL DEFAULT 0,
    totalLogistics DECIMAL(10,2),
	unitLogistics DECIMAL(10,2),
	unitSelfCost DECIMAL(10,2),
    totalSelfCost DECIMAL(10,2),
	fulfillmentCost DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS SupplierOrderDocuments (
    documentId SERIAL PRIMARY KEY,
    orderId INTEGER NOT NULL REFERENCES SupplierOrders(orderId) ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    description TEXT,
    filePath TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ShipmentStatuses (
    shipmentStatusId SERIAL PRIMARY KEY,
    "name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS MpShipments (
    shipmentId SERIAL PRIMARY KEY,
    shipmentDate DATE,
    shipmentNumber VARCHAR(50) UNIQUE NOT NULL,
	storeId INTEGER REFERENCES Stores(storeId),
    warehouseId INTEGER REFERENCES Warehouses(warehouseId),
	statusId INTEGER REFERENCES ShipmentStatuses(shipmentStatusId),
    logisticsCost DECIMAL(10,2),
	unitLogistics DECIMAL(10,2),
    acceptanceCost DECIMAL(10,2),
    acceptanceDate DATE,
    positionsQty INTEGER NOT NULL DEFAULT 0,
    sentQty INTEGER NOT NULL DEFAULT 0,
    acceptedQty INTEGER NOT NULL DEFAULT 0,
    createdBy INTEGER REFERENCES Users(userId),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedBy INTEGER REFERENCES Users(userId),
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS MpShipmentItems (
    shipmentItemId SERIAL PRIMARY KEY,
    shipmentId INTEGER REFERENCES MpShipments(shipmentId) ON DELETE CASCADE,
    productId INTEGER REFERENCES Products(productId),
	warehouseId INTEGER NOT NULL REFERENCES Warehouses(warehouseId),
    sentQty INTEGER NOT NULL DEFAULT 0,
    acceptedQty INTEGER NOT NULL DEFAULT 0,
    logisticsForItem DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS InventoryStatuses (
    inventoryStatusId SERIAL PRIMARY KEY,
    "name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Inventories (
    inventoryId SERIAL PRIMARY KEY,
    adjustmentDate DATE,
	statusId INTEGER REFERENCES InventoryStatuses(inventoryStatusId),
	notes VARCHAR(255),
    createdBy INTEGER REFERENCES Users(userId),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedBy INTEGER REFERENCES Users(userId),
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE InventoryItems (
	inventoryItemId SERIAL PRIMARY KEY,
	inventoryId INTEGER NOT NULL REFERENCES Inventories(inventoryId) ON DELETE CASCADE,
	productId INTEGER REFERENCES Products(productId),
	warehouseId INTEGER NOT NULL REFERENCES Warehouses(warehouseId),
	receiptQty INTEGER NOT NULL DEFAULT 0,
	writeOffQty INTEGER NOT NULL DEFAULT 0,
	reason VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ProductCosts (
    costId SERIAL PRIMARY KEY,
    productId INTEGER NOT NULL REFERENCES Products(productId),
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
	unitCostToWarehouse DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255),
    createdBy INTEGER REFERENCES Users(userId),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedBy INTEGER REFERENCES Users(userId),
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE StockSnapshots (
    snapshotId SERIAL PRIMARY KEY,
    productId INTEGER NOT NULL REFERENCES Products(productId),
	warehouseId INTEGER NOT NULL REFERENCES Warehouses(warehouseId),
    snapshotDate DATE NOT NULL,
    quantity INTEGER NOT NULL,
    createdBy INTEGER REFERENCES Users(userId),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (productId, warehouseId, snapshotDate)
);


CREATE INDEX idx_users_role ON Users(roleId);

CREATE INDEX idx_supplier_orders_status ON SupplierOrders(statusId);
CREATE INDEX idx_supplier_orders_parent ON SupplierOrders(parentOrderId);
CREATE INDEX idx_supplier_orders_receipt_date ON SupplierOrders(actualReceiptDate);

CREATE INDEX idx_supplier_order_items_order ON SupplierOrderItems(orderId);
CREATE INDEX idx_supplier_order_items_product ON SupplierOrderItems(productId);

CREATE INDEX idx_supplier_order_docs_order ON SupplierOrderDocuments(orderId);

CREATE INDEX idx_mp_shipments_store ON MpShipments(storeId);
CREATE INDEX idx_mp_shipments_warehouse ON MpShipments(warehouseId);
CREATE INDEX idx_mp_shipments_status ON MpShipments(statusId);

CREATE INDEX idx_mp_shipment_items_shipment ON MpShipmentItems(shipmentId);
CREATE INDEX idx_mp_shipment_items_product ON MpShipmentItems(productId);

CREATE INDEX idx_inventories_status ON Inventories(statusId);

CREATE INDEX idx_inventory_items_product ON InventoryItems(productId);

CREATE INDEX idx_product_costs_product_period
ON ProductCosts(productId, periodStart);

CREATE INDEX idx_supplier_items_stock
ON SupplierOrderItems (productId, warehouseId);

CREATE INDEX idx_shipment_items_stock
ON MpShipmentItems (productId, warehouseId);

CREATE INDEX idx_inventory_items_stock
ON InventoryItems (productId, warehouseId);