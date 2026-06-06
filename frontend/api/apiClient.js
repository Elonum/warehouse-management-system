const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class ApiError extends Error {
  constructor(message, code, status, rateLimit = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    // Optional rate limit metadata for better UX on auth screens
    // { limit: number | null, remaining: number | null, retryAfterSeconds: number | null }
    this.rateLimit = rateLimit;
  }
}

async function request(endpoint, options = {}) {
  const { envelope, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Extract rate limit headers (if present) for both success and error cases
    const rateLimit = {
      limit: null,
      remaining: null,
      retryAfterSeconds: null,
    };
    const limitHeader = response.headers.get('x-ratelimit-limit');
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const retryAfterHeader = response.headers.get('retry-after');

    if (limitHeader != null) {
      const parsed = Number(limitHeader);
      rateLimit.limit = Number.isNaN(parsed) ? null : parsed;
    }
    if (remainingHeader != null) {
      const parsed = Number(remainingHeader);
      rateLimit.remaining = Number.isNaN(parsed) ? null : parsed;
    }
    if (retryAfterHeader != null) {
      const parsed = Number(retryAfterHeader);
      rateLimit.retryAfterSeconds = Number.isNaN(parsed) ? null : parsed;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { code: 'UNKNOWN_ERROR', message: response.statusText };
      }

      throw new ApiError(
        errorData.error?.message || errorData.message || 'An error occurred',
        errorData.error?.code || 'UNKNOWN_ERROR',
        response.status,
        rateLimit
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (envelope) {
        return {
          data: data.data,
          meta: data.meta ?? null,
        };
      }
      return data.data !== undefined ? data.data : data;
    }
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors (server unreachable, CORS, etc.)
    const isNetworkError = error.name === 'TypeError' && 
      (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));
    
    if (isNetworkError) {
      throw new ApiError('Не удалось подключиться к серверу. Проверьте подключение к интернету и убедитесь, что сервер запущен.', 'NETWORK_ERROR', 0);
    }
    
    throw new ApiError(error.message || 'Ошибка сети', 'NETWORK_ERROR', 0);
  }
}

const api = {
  auth: {
    login: async (email, password) => {
      const response = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      return response;
    },

    register: async (userData) => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: userData,
      });
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      return response;
    },

    me: async () => {
      return await request('/auth/me');
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    },

    requestPasswordReset: async (email) => {
      return await request('/auth/password-reset/request', {
        method: 'POST',
        body: { email },
      });
    },

    resetPassword: async (token, newPassword) => {
      return await request('/auth/password-reset/confirm', {
        method: 'POST',
        body: { token, newPassword },
      });
    },
  },

  products: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/products${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/products/${id}`);
    },

    create: async (data) => {
      return await request('/products', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/products/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/products/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },

    // Product images
    getImages: async (productId) => {
      return await request(`/products/${productId}/images`);
    },

    uploadImage: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const url = `${API_BASE_URL}/products/images/upload`;
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { code: 'UNKNOWN_ERROR', message: response.statusText };
        }
        throw new ApiError(
          errorData.error?.message || errorData.message || 'Failed to upload image',
          errorData.error?.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      const data = await response.json();
      return data.data !== undefined ? data.data : data;
    },

    deleteImage: async (productId, imageId) => {
      await request(`/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      });
      return { success: true };
    },

    updateImageOrder: async (productId, imageId, displayOrder) => {
      await request(`/products/${productId}/images/${imageId}/order`, {
        method: 'PUT',
        body: { displayOrder },
      });
      return { success: true };
    },

  },

  warehouses: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/warehouses${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/warehouses/${id}`);
    },

    create: async (data) => {
      return await request('/warehouses', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/warehouses/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/warehouses/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  stores: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/stores${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/stores/${id}`);
    },

    create: async (data) => {
      return await request('/stores', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/stores/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/stores/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  supplierOrders: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.statusId) queryParams.append('statusId', params.statusId);
      const query = queryParams.toString();
      return await request(`/supplier-orders${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/supplier-orders/${id}`);
    },

    create: async (data) => {
      return await request('/supplier-orders', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/supplier-orders/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/supplier-orders/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },

    getItems: async (orderId) => {
      return await request(`/supplier-orders/${orderId}/items`);
    },

    getDocuments: async (orderId) => {
      return await request(`/supplier-orders/${orderId}/documents`);
    },

    createSubOrder: async (orderId, data) => {
      return await request(`/supplier-orders/${orderId}/suborders`, {
        method: 'POST',
        body: data,
      });
    },
  },

  supplierOrderItems: {
    get: async (id) => {
      return await request(`/supplier-order-items/${id}`);
    },

    create: async (data) => {
      return await request('/supplier-order-items', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/supplier-order-items/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/supplier-order-items/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  supplierOrderDocuments: {
    get: async (id) => {
      return await request(`/supplier-order-documents/${id}`);
    },

    create: async (data) => {
      return await request('/supplier-order-documents', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/supplier-order-documents/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/supplier-order-documents/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  mpShipments: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.storeId) queryParams.append('storeId', params.storeId);
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.statusId) queryParams.append('statusId', params.statusId);
      const query = queryParams.toString();
      return await request(`/mp-shipments${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/mp-shipments/${id}`);
    },

    create: async (data) => {
      return await request('/mp-shipments', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/mp-shipments/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/mp-shipments/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },

    getItems: async (shipmentId) => {
      return await request(`/mp-shipments/${shipmentId}/items`);
    },
  },

  mpShipmentItems: {
    get: async (id) => {
      return await request(`/mp-shipment-items/${id}`);
    },

    create: async (data) => {
      return await request('/mp-shipment-items', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/mp-shipment-items/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/mp-shipment-items/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  integrations: {
    wildberries: {
      /** @param {{ dateFrom?: string }} body — RFC3339 или YYYY-MM-DD; пусто = дефолт WB (с 2020-11-15). */
      listStocks: async (body = {}) => {
        return await request('/integrations/wildberries/stocks/list', {
          method: 'POST',
          body,
        });
      },
    },
    ozon: {
      listStocks: async (body = {}) => {
        return await request('/integrations/ozon/stocks/list', {
          method: 'POST',
          body,
        });
      },
    },
  },

  orderStatuses: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/order-statuses${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/order-statuses/${id}`);
    },

    create: async (data) => {
      return await request('/order-statuses', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/order-statuses/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/order-statuses/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  shipmentStatuses: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/shipment-statuses${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/shipment-statuses/${id}`);
    },

    create: async (data) => {
      return await request('/shipment-statuses', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/shipment-statuses/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/shipment-statuses/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  inventoryStatuses: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/inventory-statuses${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/inventory-statuses/${id}`);
    },

    create: async (data) => {
      return await request('/inventory-statuses', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/inventory-statuses/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/inventory-statuses/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  inventories: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.statusId) queryParams.append('statusId', params.statusId);
      const query = queryParams.toString();
      return await request(`/inventories${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/inventories/${id}`);
    },

    create: async (data) => {
      return await request('/inventories', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/inventories/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/inventories/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },

    getItems: async (inventoryId) => {
      return await request(`/inventories/${inventoryId}/items`);
    },

  },

  inventoryItems: {
    get: async (id) => {
      return await request(`/inventory-items/${id}`);
    },

    create: async (data) => {
      return await request('/inventory-items', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/inventory-items/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/inventory-items/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  productCosts: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.productId) queryParams.append('productId', params.productId);
      if (params.q) queryParams.append('q', params.q);
      if (params.view) queryParams.append('view', params.view);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      if (params.limit != null) queryParams.append('limit', String(params.limit));
      if (params.offset != null) queryParams.append('offset', String(params.offset));
      const query = queryParams.toString();
      const raw = await request(`/product-costs${query ? `?${query}` : ''}`, { envelope: true });
      const data = raw.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const summary = data.summary || { totalRows: 0, activeRows: 0, productRows: 0 };
      const m = raw.meta || {};
      return {
        items,
        summary,
        meta: {
          limit: Number(m.limit) || 50,
          offset: Number(m.offset) || 0,
          total: Number(m.total) || 0,
        },
      };
    },

    missing: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.append('q', params.q);
      if (params.limit != null) queryParams.append('limit', String(params.limit));
      if (params.offset != null) queryParams.append('offset', String(params.offset));
      const query = queryParams.toString();
      const raw = await request(`/product-costs/missing${query ? `?${query}` : ''}`, { envelope: true });
      const data = raw.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const m = raw.meta || {};
      return {
        items,
        meta: {
          limit: Number(m.limit) || 50,
          offset: Number(m.offset) || 0,
          total: Number(m.total) || 0,
        },
      };
    },

    dataQuality: async () => {
      const raw = await request(`/product-costs/data-quality`, { envelope: true });
      return raw.data || {};
    },

    get: async (id) => {
      return await request(`/product-costs/${id}`);
    },

    create: async (data) => {
      return await request('/product-costs', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/product-costs/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/product-costs/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  stockSnapshots: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.productId) queryParams.append('productId', params.productId);
      if (params.q) queryParams.append('q', params.q);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      if (params.view) queryParams.append('view', params.view);
      if (params.ownWarehousesOnly != null) {
        queryParams.append('ownWarehousesOnly', String(params.ownWarehousesOnly));
      }
      if (params.limit != null) queryParams.append('limit', String(params.limit));
      if (params.offset != null) queryParams.append('offset', String(params.offset));
      const query = queryParams.toString();
      const raw = await request(`/stock-snapshots${query ? `?${query}` : ''}`, { envelope: true });
      const data = raw.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const summary = data.summary || {
        totalRows: 0,
        uniquePairs: 0,
        earliestDate: null,
        latestDate: null,
      };
      const m = raw.meta || {};
      return {
        items,
        summary,
        meta: {
          limit: Number(m.limit) || 50,
          offset: Number(m.offset) || 0,
          total: Number(m.total) || 0,
        },
      };
    },

    get: async (id) => {
      return await request(`/stock-snapshots/${id}`);
    },

    create: async (data) => {
      return await request('/stock-snapshots', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/stock-snapshots/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/stock-snapshots/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  stock: {
    /** @returns {{ items: any[], meta: { limit?: number, offset?: number, total?: number } }} */
    getCurrent: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.productId) queryParams.append('productId', params.productId);
      if (params.q) queryParams.append('q', params.q);
      if (params.levelFilter) queryParams.append('levelFilter', params.levelFilter);
      if (params.limit != null) queryParams.append('limit', String(params.limit));
      if (params.offset != null) queryParams.append('offset', String(params.offset));
      const query = queryParams.toString();
      const raw = await request(`/stock/current${query ? `?${query}` : ''}`, {
        envelope: true,
      });
      const data = raw.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const summary = data.summary || {
        totalStockValue: 0,
        rowsMissingCost: 0,
        rowsWithCost: 0,
        totalRows: 0,
      };
      const m = raw.meta || {};
      return {
        items,
        summary,
        meta: {
          limit: Number(m.limit) || 50,
          offset: Number(m.offset) || 0,
          total: Number(m.total) || 0,
        },
      };
    },

    listMovements: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.productId) queryParams.append('productId', params.productId);
      if (params.movementType) queryParams.append('movementType', params.movementType);
      if (params.q) queryParams.append('q', params.q);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      if (params.ownWarehousesOnly != null) {
        queryParams.append('ownWarehousesOnly', String(params.ownWarehousesOnly));
      }
      if (params.limit != null) queryParams.append('limit', String(params.limit));
      if (params.offset != null) queryParams.append('offset', String(params.offset));
      const query = queryParams.toString();
      const raw = await request(`/stock/movements${query ? `?${query}` : ''}`, { envelope: true });
      const data = raw.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const summary = data.summary || { totalRows: 0, totalIn: 0, totalOut: 0 };
      const m = raw.meta || {};
      return {
        items,
        summary: {
          totalRows: Number(summary.totalRows) || 0,
          totalIn: Number(summary.totalIn) || 0,
          totalOut: Number(summary.totalOut) || 0,
        },
        meta: {
          limit: Number(m.limit) || 50,
          offset: Number(m.offset) || 0,
          total: Number(m.total) || summary.totalRows || 0,
        },
      };
    },
  },

  users: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/users${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/users/${id}`);
    },

    create: async (data) => {
      return await request('/users', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/users/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/users/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  roles: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/roles${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/roles/${id}`);
    },

    create: async (data) => {
      return await request('/roles', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/roles/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/roles/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  upload: {
    uploadFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const url = `${API_BASE_URL}/upload`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { code: 'UNKNOWN_ERROR', message: response.statusText };
        }
        throw new ApiError(
          errorData.error?.message || errorData.message || 'Ошибка загрузки файла',
          errorData.error?.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      const data = await response.json();
      return data.data || data;
    },

    getFileUrl: (filePath) => {
      if (!filePath) return null;
      const normalized = String(filePath).replace(/\\/g, '/');
      return `${API_BASE_URL}/files?path=${encodeURIComponent(normalized)}`;
    },

    /** Opens a file in a new tab using Authorization (required for documents). */
    openFile: async (filePath) => {
      const url = api.upload.getFileUrl(filePath);
      if (!url) {
        throw new ApiError('File path is missing', 'INVALID_FILE', 400);
      }
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new ApiError('Failed to open file', 'FILE_OPEN_FAILED', response.status);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
  },
};

export { api, ApiError };
export default api;

