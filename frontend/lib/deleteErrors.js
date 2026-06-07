import { ApiError } from '@/api';

/** @type {Record<string, string>} */
const DELETE_IN_USE_I18N = {
  PRODUCT_IN_USE: 'products.errors.deleteInUse',
  WAREHOUSE_IN_USE: 'warehouses.errors.deleteInUse',
  STORE_IN_USE: 'warehouses.errors.storeDeleteInUse',
  ROLE_IN_USE: 'referenceData.roles.errors.roleInUseSingle',
  ORDER_COMPLETED: 'supplierOrderDetails.errors.cannotDeleteCompleted',
  ORDER_HAS_SUB_ORDERS: 'supplierOrders.errors.hasSubOrders',
  INVENTORY_COMPLETED: 'inventoryAdjustments.errors.cannotDeleteCompleted',
  SHIPMENT_COMPLETED: 'shipments.errors.cannotDeleteCompleted',
};

/**
 * Maps API delete errors to user-facing i18n messages.
 * @param {unknown} err
 * @param {(key: string, params?: object) => string} t
 * @param {{ failedKey: string, inUseKey?: string }} options
 */
export function messageForDeleteError(err, t, { failedKey, inUseKey = null }) {
  if (!(err instanceof ApiError)) {
    return t(failedKey);
  }

  if (err.code === 'STATUS_IN_USE' && inUseKey) {
    return t(inUseKey);
  }

  const mapped = DELETE_IN_USE_I18N[err.code];
  if (mapped) {
    return t(mapped);
  }

  return t(failedKey);
}
