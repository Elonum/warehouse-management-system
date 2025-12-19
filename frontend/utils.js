/**
 * Utility functions
 */

/**
 * Creates a page URL from page name
 * @param {string} pageName - Name of the page (e.g., 'Dashboard', 'Products')
 * @returns {string} - URL path (e.g., '/dashboard', '/products')
 */
export function createPageUrl(pageName) {
  const pageMap = {
    Dashboard: '/',
    Products: '/products',
    Warehouses: '/warehouses',
    Stock: '/stock',
    StockMovements: '/stock-movements',
    SupplierOrders: '/supplier-orders',
    SupplierOrderDetails: '/supplier-orders/details',
    Shipments: '/shipments',
    ShipmentDetails: '/shipments/details',
    InventoryAdjustments: '/inventory-adjustments',
    InventoryAdjustmentDetails: '/inventory-adjustments/details',
    ProductCosts: '/product-costs',
    UsersRoles: '/users-roles',
    ReferenceData: '/reference-data',
  };

  return pageMap[pageName] || `/${pageName.toLowerCase()}`;
}

