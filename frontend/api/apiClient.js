const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

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
        response.status
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data.data !== undefined ? data.data : data;
    }
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error', 'NETWORK_ERROR', 0);
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

    setImageAsMain: async (productId, imageId) => {
      await request(`/products/${productId}/images/${imageId}/main`, {
        method: 'PUT',
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

  warehouseTypes: {
    list: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      const query = queryParams.toString();
      return await request(`/warehouse-types${query ? `?${query}` : ''}`);
    },

    get: async (id) => {
      return await request(`/warehouse-types/${id}`);
    },

    create: async (data) => {
      return await request('/warehouse-types', {
        method: 'POST',
        body: data,
      });
    },

    update: async (id, data) => {
      return await request(`/warehouse-types/${id}`, {
        method: 'PUT',
        body: data,
      });
    },

    delete: async (id) => {
      await request(`/warehouse-types/${id}`, {
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
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.productId) queryParams.append('productId', params.productId);
      const query = queryParams.toString();
      return await request(`/product-costs${query ? `?${query}` : ''}`);
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
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.productId) queryParams.append('productId', params.productId);
      const query = queryParams.toString();
      return await request(`/stock-snapshots${query ? `?${query}` : ''}`);
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
    getCurrent: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
      if (params.productId) queryParams.append('productId', params.productId);
      const query = queryParams.toString();
      return await request(`/stock/current${query ? `?${query}` : ''}`);
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
      const token = localStorage.getItem('auth_token');
      const fileName = filePath.split('/').pop();
      return `${API_BASE_URL}/files?path=${encodeURIComponent(fileName)}${token ? `&token=${token}` : ''}`;
    },
  },
};

export { api, ApiError };
export default api;

