/**
 * Mock API Client for development/testing without backend
 * Returns realistic test data for all entities
 */

// Helper to simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data generators
const generateId = () => Math.floor(Math.random() * 1000000);

const mockProducts = [
  { id: 1, article: 'PRD-001', name: 'Смартфон Samsung Galaxy', barcode: '1234567890123', unit_weight: 0.2, base_unit_cost: 299.99, category: 'Электроника', status: 'active' },
  { id: 2, article: 'PRD-002', name: 'Ноутбук Lenovo ThinkPad', barcode: '1234567890124', unit_weight: 1.5, base_unit_cost: 899.99, category: 'Электроника', status: 'active' },
  { id: 3, article: 'PRD-003', name: 'Наушники AirPods Pro', barcode: '1234567890125', unit_weight: 0.05, base_unit_cost: 249.99, category: 'Аксессуары', status: 'active' },
  { id: 4, article: 'PRD-004', name: 'Планшет iPad Air', barcode: '1234567890126', unit_weight: 0.46, base_unit_cost: 599.99, category: 'Электроника', status: 'active' },
  { id: 5, article: 'PRD-005', name: 'Клавиатура механическая', barcode: '1234567890127', unit_weight: 0.8, base_unit_cost: 149.99, category: 'Периферия', status: 'active' },
  { id: 6, article: 'PRD-006', name: 'Мышь беспроводная', barcode: '1234567890128', unit_weight: 0.1, base_unit_cost: 79.99, category: 'Периферия', status: 'active' },
  { id: 7, article: 'PRD-007', name: 'Монитор 27" 4K', barcode: '1234567890129', unit_weight: 5.2, base_unit_cost: 399.99, category: 'Мониторы', status: 'active' },
  { id: 8, article: 'PRD-008', name: 'Веб-камера HD', barcode: '1234567890130', unit_weight: 0.15, base_unit_cost: 99.99, category: 'Периферия', status: 'inactive' },
];

const mockWarehouses = [
  { id: 1, name: 'Склад Москва', type: 1, location: 'Москва, ул. Складская, 1', status: 'active' },
  { id: 2, name: 'Склад Казань', type: 1, location: 'Казань, пр. Победы, 10', status: 'active' },
  { id: 3, name: 'Склад СПб', type: 2, location: 'Санкт-Петербург, ул. Логистическая, 5', status: 'active' },
  { id: 4, name: 'Склад Новосибирск', type: 1, location: 'Новосибирск, ул. Складская, 20', status: 'active' },
];

const mockStores = [
  { id: 1, name: 'Wildberries' },
  { id: 2, name: 'Ozon' },
  { id: 3, name: 'Яндекс.Маркет' },
  { id: 4, name: 'СберМегаМаркет' },
];

const mockStock = [
  { id: 1, product_id: 1, warehouse_id: 1, quantity: 150, available_quantity: 120, reserved_quantity: 30, unit_cost: 299.99, total_value: 44998.50 },
  { id: 2, product_id: 1, warehouse_id: 2, quantity: 80, available_quantity: 80, reserved_quantity: 0, unit_cost: 299.99, total_value: 23999.20 },
  { id: 3, product_id: 2, warehouse_id: 1, quantity: 45, available_quantity: 40, reserved_quantity: 5, unit_cost: 899.99, total_value: 40499.55 },
  { id: 4, product_id: 3, warehouse_id: 1, quantity: 200, available_quantity: 180, reserved_quantity: 20, unit_cost: 249.99, total_value: 49998.00 },
  { id: 5, product_id: 4, warehouse_id: 2, quantity: 60, available_quantity: 55, reserved_quantity: 5, unit_cost: 599.99, total_value: 35999.40 },
  { id: 6, product_id: 5, warehouse_id: 1, quantity: 120, available_quantity: 100, reserved_quantity: 20, unit_cost: 149.99, total_value: 17998.80 },
  { id: 7, product_id: 6, warehouse_id: 2, quantity: 250, available_quantity: 230, reserved_quantity: 20, unit_cost: 79.99, total_value: 19997.50 },
  { id: 8, product_id: 7, warehouse_id: 1, quantity: 30, available_quantity: 25, reserved_quantity: 5, unit_cost: 399.99, total_value: 11999.70 },
];

// Add product_name and warehouse_name to stock for display
mockStock.forEach(stock => {
  const product = mockProducts.find(p => p.id === stock.product_id);
  const warehouse = mockWarehouses.find(w => w.id === stock.warehouse_id);
  stock.product_name = product?.name || 'Unknown';
  stock.warehouse_name = warehouse?.name || 'Unknown';
});

const mockSupplierOrders = [
  { 
    id: 1, 
    order_number: 'ORD-2024-001', 
    supplier_name: 'Поставщик Китай', 
    status: 'in_transit', 
    order_date: '2024-01-15', 
    expected_date: '2024-02-01',
    actual_receipt_date: null,
    logistics_cost: 1500.00,
    total: 45000.00,
    total_quantity: 120,
    parent_order_id: null,
    created_at: '2024-01-15T10:00:00Z'
  },
  { 
    id: 2, 
    order_number: 'ORD-2024-002', 
    supplier_name: 'Поставщик Европа', 
    status: 'confirmed', 
    order_date: '2024-01-20', 
    expected_date: '2024-02-10',
    actual_receipt_date: null,
    logistics_cost: 2000.00,
    total: 60000.00,
    total_quantity: 80,
    parent_order_id: null,
    created_at: '2024-01-20T14:30:00Z'
  },
  { 
    id: 3, 
    order_number: 'ORD-2024-003', 
    supplier_name: 'Поставщик Китай', 
    status: 'pending', 
    order_date: '2024-01-25', 
    expected_date: '2024-02-15',
    actual_receipt_date: null,
    logistics_cost: 1200.00,
    total: 35000.00,
    total_quantity: 100,
    parent_order_id: null,
    created_at: '2024-01-25T09:15:00Z'
  },
  { 
    id: 4, 
    order_number: 'ORD-2024-004', 
    supplier_name: 'Поставщик Россия', 
    status: 'received', 
    order_date: '2024-01-10', 
    expected_date: '2024-01-25',
    actual_receipt_date: '2024-01-24',
    logistics_cost: 800.00,
    total: 25000.00,
    total_quantity: 50,
    parent_order_id: null,
    created_at: '2024-01-10T11:20:00Z'
  },
  { 
    id: 5, 
    order_number: 'ORD-2024-005', 
    supplier_name: 'Поставщик Китай', 
    status: 'draft', 
    order_date: '2024-01-28', 
    expected_date: null,
    actual_receipt_date: null,
    logistics_cost: null,
    total: 0,
    total_quantity: 0,
    parent_order_id: null,
    created_at: '2024-01-28T16:45:00Z'
  },
];

const mockShipments = [
  { 
    id: 1, 
    shipment_number: 'SHIP-2024-001', 
    shipment_date: '2024-01-20',
    store_id: 1,
    warehouse_id: 1,
    status: 'shipped', 
    acceptance_date: null,
    logistics_cost: 500.00,
    positions_qty: 15,
    sent_qty: 150,
    accepted_qty: 0,
    created_at: '2024-01-20T10:00:00Z',
    store_name: 'Wildberries',
    warehouse_name: 'Склад Москва'
  },
  { 
    id: 2, 
    shipment_number: 'SHIP-2024-002', 
    shipment_date: '2024-01-22',
    store_id: 2,
    warehouse_id: 2,
    status: 'accepted', 
    acceptance_date: '2024-01-25',
    logistics_cost: 600.00,
    positions_qty: 20,
    sent_qty: 200,
    accepted_qty: 200,
    created_at: '2024-01-22T14:30:00Z',
    store_name: 'Ozon',
    warehouse_name: 'Склад Казань'
  },
  { 
    id: 3, 
    shipment_number: 'SHIP-2024-003', 
    shipment_date: '2024-01-25',
    store_id: 1,
    warehouse_id: 1,
    status: 'draft', 
    acceptance_date: null,
    logistics_cost: null,
    positions_qty: 10,
    sent_qty: 0,
    accepted_qty: 0,
    created_at: '2024-01-25T09:15:00Z',
    store_name: 'Wildberries',
    warehouse_name: 'Склад Москва'
  },
];

const mockStockMovements = [
  { 
    id: 1, 
    product_id: 1, 
    warehouse_id: 1, 
    movement_date: '2024-01-24', 
    quantity: 50, 
    movement_type: 'incoming', // Frontend ожидает 'incoming', 'outgoing', или 'adjustment'
    source_type: 'Supplier Order',
    source_number: 'ORD-2024-004',
    product_name: 'Смартфон Samsung Galaxy',
    warehouse_name: 'Склад Москва'
  },
  { 
    id: 2, 
    product_id: 2, 
    warehouse_id: 1, 
    movement_date: '2024-01-24', 
    quantity: 20, 
    movement_type: 'incoming',
    source_type: 'Supplier Order',
    source_number: 'ORD-2024-004',
    product_name: 'Ноутбук Lenovo ThinkPad',
    warehouse_name: 'Склад Москва'
  },
  { 
    id: 3, 
    product_id: 1, 
    warehouse_id: 1, 
    movement_date: '2024-01-25', 
    quantity: -30, 
    movement_type: 'outgoing',
    source_type: 'Shipment',
    source_number: 'SHIP-2024-002',
    product_name: 'Смартфон Samsung Galaxy',
    warehouse_name: 'Склад Москва'
  },
  { 
    id: 4, 
    product_id: 3, 
    warehouse_id: 1, 
    movement_date: '2024-01-26', 
    quantity: 100, 
    movement_type: 'incoming',
    source_type: 'Supplier Order',
    source_number: 'ORD-2024-001',
    product_name: 'Наушники AirPods Pro',
    warehouse_name: 'Склад Москва'
  },
  { 
    id: 5, 
    product_id: 4, 
    warehouse_id: 2, 
    movement_date: '2024-01-27', 
    quantity: -10, 
    movement_type: 'outgoing',
    source_type: 'Shipment',
    source_number: 'SHIP-2024-002',
    product_name: 'Планшет iPad Air',
    warehouse_name: 'Склад Казань'
  },
];

// Entity API methods with mock data
const entities = {
  Product: {
    list: async (sort, limit) => {
      await delay();
      let result = [...mockProducts];
      if (sort?.startsWith('-')) {
        result.reverse();
      }
      if (limit) {
        result = result.slice(0, limit);
      }
      return result;
    },
    get: async (id) => {
      await delay();
      return mockProducts.find(p => p.id === parseInt(id));
    },
    create: async (data) => {
      await delay();
      const newProduct = { id: generateId(), ...data, created_at: new Date().toISOString() };
      mockProducts.push(newProduct);
      return newProduct;
    },
    update: async (id, data) => {
      await delay();
      const index = mockProducts.findIndex(p => p.id === parseInt(id));
      if (index !== -1) {
        mockProducts[index] = { ...mockProducts[index], ...data, updated_at: new Date().toISOString() };
        return mockProducts[index];
      }
      throw new Error('Product not found');
    },
    delete: async (id) => {
      await delay();
      const index = mockProducts.findIndex(p => p.id === parseInt(id));
      if (index !== -1) {
        mockProducts.splice(index, 1);
        return { success: true };
      }
      throw new Error('Product not found');
    },
    filter: async (filters) => {
      await delay();
      return mockProducts.filter(p => {
        return Object.entries(filters).every(([key, value]) => {
          const field = key.replace('_', '');
          return p[field] === value || p[key] === value;
        });
      });
    },
  },

  Warehouse: {
    list: async (sort, limit) => {
      await delay();
      let result = [...mockWarehouses];
      if (sort?.startsWith('-')) {
        result.reverse();
      }
      if (limit) {
        result = result.slice(0, limit);
      }
      return result;
    },
    get: async (id) => {
      await delay();
      return mockWarehouses.find(w => w.id === parseInt(id));
    },
    create: async (data) => {
      await delay();
      const newWarehouse = { id: generateId(), ...data, created_at: new Date().toISOString() };
      mockWarehouses.push(newWarehouse);
      return newWarehouse;
    },
    update: async (id, data) => {
      await delay();
      const index = mockWarehouses.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        mockWarehouses[index] = { ...mockWarehouses[index], ...data, updated_at: new Date().toISOString() };
        return mockWarehouses[index];
      }
      throw new Error('Warehouse not found');
    },
    delete: async (id) => {
      await delay();
      const index = mockWarehouses.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        mockWarehouses.splice(index, 1);
        return { success: true };
      }
      throw new Error('Warehouse not found');
    },
    filter: async (filters) => {
      await delay();
      return mockWarehouses.filter(w => {
        return Object.entries(filters).every(([key, value]) => {
          return w[key] === value;
        });
      });
    },
  },

  Store: {
    list: async (sort, limit) => {
      await delay();
      return [...mockStores];
    },
    get: async (id) => {
      await delay();
      return mockStores.find(s => s.id === parseInt(id));
    },
    create: async (data) => {
      await delay();
      const newStore = { id: generateId(), ...data };
      mockStores.push(newStore);
      return newStore;
    },
    update: async (id, data) => {
      await delay();
      const index = mockStores.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        mockStores[index] = { ...mockStores[index], ...data };
        return mockStores[index];
      }
      throw new Error('Store not found');
    },
    delete: async (id) => {
      await delay();
      const index = mockStores.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        mockStores.splice(index, 1);
        return { success: true };
      }
      throw new Error('Store not found');
    },
    filter: async (filters) => {
      await delay();
      return mockStores.filter(s => {
        return Object.entries(filters).every(([key, value]) => {
          return s[key] === value;
        });
      });
    },
  },

  Stock: {
    list: async (sort, limit) => {
      await delay();
      return [...mockStock];
    },
    get: async (id) => {
      await delay();
      return mockStock.find(s => s.id === parseInt(id));
    },
  },

  StockMovement: {
    list: async (sort, limit) => {
      await delay();
      let result = [...mockStockMovements];
      if (sort?.startsWith('-')) {
        result.reverse();
      }
      if (limit) {
        result = result.slice(0, limit);
      }
      return result;
    },
    get: async (id) => {
      await delay();
      return mockStockMovements.find(m => m.id === parseInt(id));
    },
    filter: async (filters) => {
      await delay();
      return mockStockMovements.filter(m => {
        return Object.entries(filters).every(([key, value]) => {
          return m[key] === value;
        });
      });
    },
  },

  SupplierOrder: {
    list: async (sort, limit) => {
      await delay();
      let result = [...mockSupplierOrders];
      if (sort?.startsWith('-')) {
        result.reverse();
      }
      if (limit) {
        result = result.slice(0, limit);
      }
      return result;
    },
    get: async (id) => {
      await delay();
      return mockSupplierOrders.find(o => o.id === parseInt(id));
    },
    create: async (data) => {
      await delay();
      const newOrder = { 
        id: generateId(), 
        ...data, 
        total: 0,
        total_quantity: 0,
        created_at: new Date().toISOString() 
      };
      mockSupplierOrders.push(newOrder);
      return newOrder;
    },
    update: async (id, data) => {
      await delay();
      const index = mockSupplierOrders.findIndex(o => o.id === parseInt(id));
      if (index !== -1) {
        mockSupplierOrders[index] = { ...mockSupplierOrders[index], ...data, updated_at: new Date().toISOString() };
        return mockSupplierOrders[index];
      }
      throw new Error('Order not found');
    },
    delete: async (id) => {
      await delay();
      const index = mockSupplierOrders.findIndex(o => o.id === parseInt(id));
      if (index !== -1) {
        mockSupplierOrders.splice(index, 1);
        return { success: true };
      }
      throw new Error('Order not found');
    },
    filter: async (filters) => {
      await delay();
      return mockSupplierOrders.filter(o => {
        return Object.entries(filters).every(([key, value]) => {
          if (key === 'id') {
            return o.id === parseInt(value);
          }
          return o[key] === value;
        });
      });
    },
  },

  SupplierOrderItem: {
    list: async () => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  SupplierOrderDocument: {
    list: async () => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  Shipment: {
    list: async (sort, limit) => {
      await delay();
      let result = [...mockShipments];
      if (sort?.startsWith('-')) {
        result.reverse();
      }
      if (limit) {
        result = result.slice(0, limit);
      }
      return result;
    },
    get: async (id) => {
      await delay();
      return mockShipments.find(s => s.id === parseInt(id));
    },
    create: async (data) => {
      await delay();
      const newShipment = { id: generateId(), ...data, created_at: new Date().toISOString() };
      mockShipments.push(newShipment);
      return newShipment;
    },
    update: async (id, data) => {
      await delay();
      const index = mockShipments.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        mockShipments[index] = { ...mockShipments[index], ...data, updated_at: new Date().toISOString() };
        return mockShipments[index];
      }
      throw new Error('Shipment not found');
    },
    delete: async (id) => {
      await delay();
      const index = mockShipments.findIndex(s => s.id === parseInt(id));
      if (index !== -1) {
        mockShipments.splice(index, 1);
        return { success: true };
      }
      throw new Error('Shipment not found');
    },
    filter: async (filters) => {
      await delay();
      return mockShipments.filter(s => {
        return Object.entries(filters).every(([key, value]) => {
          if (key === 'id') {
            return s.id === parseInt(value);
          }
          return s[key] === value;
        });
      });
    },
  },

  ShipmentItem: {
    list: async () => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  InventoryAdjustment: {
    list: async (sort, limit) => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data, created_at: new Date().toISOString() };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data, updated_at: new Date().toISOString() };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  InventoryAdjustmentItem: {
    list: async () => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  ProductCost: {
    list: async (sort, limit) => {
      await delay();
      return [];
    },
    get: async (id) => {
      await delay();
      return null;
    },
    create: async (data) => {
      await delay();
      return { id: generateId(), ...data, created_at: new Date().toISOString() };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data, updated_at: new Date().toISOString() };
    },
    delete: async (id) => {
      await delay();
      return { success: true };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },

  User: {
    list: async (sort, limit) => {
      await delay();
      return [
        { id: 1, email: 'admin@example.com', name: 'Администратор', surname: 'Системы', role: 'admin', full_name: 'Администратор Системы' },
        { id: 2, email: 'manager@example.com', name: 'Менеджер', surname: 'Склада', role: 'manager', full_name: 'Менеджер Склада' },
      ];
    },
    get: async (id) => {
      await delay();
      return { id: 1, email: 'admin@example.com', name: 'Администратор', role: 'admin' };
    },
    update: async (id, data) => {
      await delay();
      return { id: parseInt(id), ...data };
    },
    filter: async (filters) => {
      await delay();
      return [];
    },
  },
};

// Auth methods
const auth = {
  me: async () => {
    await delay();
    return { 
      id: 1, 
      email: 'admin@example.com', 
      name: 'Администратор', 
      surname: 'Системы',
      role: 'admin',
      full_name: 'Администратор Системы'
    };
  },
  login: async (email, password) => {
    await delay();
    localStorage.setItem('auth_token', 'mock_token_' + Date.now());
    return { token: 'mock_token', user: { id: 1, email, name: 'Admin' } };
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  },
};

// File upload mock
const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      await delay(500);
      return { file_url: `https://example.com/uploads/${file.name}` };
    },
  },
};

// Export mock API client
export const api = {
  entities,
  auth,
  integrations,
};

export default api;

