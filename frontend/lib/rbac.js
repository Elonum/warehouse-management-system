/** @typedef {{ permissions?: string[], roleName?: string }} AuthProfile */

export const PERM = {
  ADMIN: 'admin',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_WRITE: 'products.write',
  WAREHOUSES_READ: 'warehouses.read',
  STOCK_READ: 'stock.read',
  STOCK_SNAPSHOTS_WRITE: 'stock.snapshots.write',
  STOCK_MOVEMENTS_READ: 'stock.movements.read',
  PROCUREMENT_READ: 'procurement.read',
  PROCUREMENT_WRITE: 'procurement.write',
  DELIVERY_WRITE: 'delivery.write',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  FINANCE_READ: 'finance.read',
  FINANCE_WRITE: 'finance.write',
  MARKETPLACE_READ: 'marketplace.read',
  MARKETPLACE_WRITE: 'marketplace.write',
  INTEGRATIONS_READ: 'integrations.read',
  STORES_READ: 'stores.read',
  REFERENCE_READ: 'reference.read',
};

const NAV_PERMISSIONS = {
  dashboard: [],
  products: [PERM.PRODUCTS_READ],
  warehouses: [PERM.WAREHOUSES_READ],
  stock: [PERM.STOCK_READ],
  stockSnapshots: [PERM.STOCK_READ],
  stockMovements: [PERM.STOCK_MOVEMENTS_READ],
  supplierOrders: [PERM.PROCUREMENT_READ],
  shipments: [PERM.MARKETPLACE_READ],
  inventoryAdjustments: [PERM.INVENTORY_READ],
  productCosts: [PERM.FINANCE_READ],
  usersRoles: [PERM.ADMIN],
  referenceData: [PERM.ADMIN],
};

const ROUTE_NAV_KEY = {
  '/': 'dashboard',
  '/products': 'products',
  '/products/details': 'products',
  '/warehouses': 'warehouses',
  '/warehouses/details': 'warehouses',
  '/stock': 'stock',
  '/stock-snapshots': 'stockSnapshots',
  '/stock-movements': 'stockMovements',
  '/supplier-orders': 'supplierOrders',
  '/supplier-orders/details': 'supplierOrders',
  '/shipments': 'shipments',
  '/shipments/details': 'shipments',
  '/inventory-adjustments': 'inventoryAdjustments',
  '/inventory-adjustments/details': 'inventoryAdjustments',
  '/product-costs': 'productCosts',
  '/users-roles': 'usersRoles',
  '/reference-data': 'referenceData',
};

const ROUTE_PERMISSIONS = {
  '/': [],
  '/products': [PERM.PRODUCTS_READ],
  '/products/details': [PERM.PRODUCTS_READ],
  '/warehouses': [PERM.WAREHOUSES_READ],
  '/warehouses/details': [PERM.WAREHOUSES_READ],
  '/stock': [PERM.STOCK_READ],
  '/stock-snapshots': [PERM.STOCK_READ],
  '/stock-movements': [PERM.STOCK_MOVEMENTS_READ],
  '/supplier-orders': [PERM.PROCUREMENT_READ],
  '/supplier-orders/details': [PERM.PROCUREMENT_READ],
  '/shipments': [PERM.MARKETPLACE_READ],
  '/shipments/details': [PERM.MARKETPLACE_READ],
  '/inventory-adjustments': [PERM.INVENTORY_READ],
  '/inventory-adjustments/details': [PERM.INVENTORY_READ],
  '/product-costs': [PERM.FINANCE_READ],
  '/users-roles': [PERM.ADMIN],
  '/reference-data': [PERM.ADMIN],
};

export function hasPermission(profile, permission) {
  if (!permission) return true;
  const perms = profile?.permissions ?? [];
  return perms.includes(permission);
}

export function hasAnyPermission(profile, required = []) {
  if (!required?.length) return true;
  const perms = profile?.permissions ?? [];
  return required.some((p) => perms.includes(p));
}

export function canAccessNavItem(profile, navKey) {
  return hasAnyPermission(profile, NAV_PERMISSIONS[navKey] ?? []);
}

export function canAccessRoute(profile, pathname) {
  return hasAnyPermission(profile, ROUTE_PERMISSIONS[pathname] ?? []);
}

export function navPermissionsForKey(navKey) {
  return NAV_PERMISSIONS[navKey] ?? [];
}

export function routeNavKey(pathname) {
  return ROUTE_NAV_KEY[pathname] ?? null;
}

export function requiredPermissionsForRoute(pathname) {
  return ROUTE_PERMISSIONS[pathname] ?? [];
}

/** @returns {Record<string, boolean>} */
export function permissionFlags(profile) {
  const canWriteProcurement = hasPermission(profile, PERM.PROCUREMENT_WRITE);
  const canWriteDelivery = hasPermission(profile, PERM.DELIVERY_WRITE);

  return {
    canAdmin: hasPermission(profile, PERM.ADMIN),
    canWriteProducts: hasPermission(profile, PERM.PRODUCTS_WRITE),
    canWriteWarehouses: hasPermission(profile, PERM.WAREHOUSES_WRITE),
    canWriteStores: hasPermission(profile, PERM.STORES_WRITE),
    canWriteStockSnapshots: hasPermission(profile, PERM.STOCK_SNAPSHOTS_WRITE),
    canWriteProcurement,
    canWriteDelivery,
    canMutateProcurementOrder: canWriteProcurement || canWriteDelivery,
    canCreateProcurementOrder: canWriteProcurement,
    canDeleteProcurementOrder: canWriteProcurement,
    canCreateProcurementItem: canWriteProcurement,
    canMutateProcurementItem: canWriteProcurement || canWriteDelivery,
    canDeleteProcurementItem: canWriteProcurement,
    canWriteInventory: hasPermission(profile, PERM.INVENTORY_WRITE),
    canWriteFinance: hasPermission(profile, PERM.FINANCE_WRITE),
    canWriteMarketplace: hasPermission(profile, PERM.MARKETPLACE_WRITE),
    canReadIntegrations: hasPermission(profile, PERM.INTEGRATIONS_READ),
  };
}
