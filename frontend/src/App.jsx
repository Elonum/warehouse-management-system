import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from '../layout.jsx'
import Dashboard from '../pages/Dashboard'
import Products from '../pages/Products'
import Warehouses from '../pages/Warehouses'
import Stock from '../pages/Stock'
import StockMovements from '../pages/StockMovements'
import SupplierOrders from '../pages/SupplierOrders'
import SupplierOrderDetails from '../pages/SupplierOrderDetails'
import Shipments from '../pages/Shipments'
import ShipmentDetails from '../pages/ShipmentDetails'
import InventoryAdjustments from '../pages/InventoryAdjustments'
import InventoryAdjustmentDetails from '../pages/InventoryAdjustmentDetails'
import ProductCosts from '../pages/ProductCosts'
import UsersRoles from '../pages/UsersRoles'
import ReferenceData from '../pages/ReferenceData'

const pageNameMap = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/warehouses': 'Warehouses',
  '/stock': 'Stock',
  '/stock-movements': 'StockMovements',
  '/supplier-orders': 'SupplierOrders',
  '/supplier-orders/details': 'SupplierOrderDetails',
  '/shipments': 'Shipments',
  '/shipments/details': 'ShipmentDetails',
  '/inventory-adjustments': 'InventoryAdjustments',
  '/inventory-adjustments/details': 'InventoryAdjustmentDetails',
  '/product-costs': 'ProductCosts',
  '/users-roles': 'UsersRoles',
  '/reference-data': 'ReferenceData',
}

function App() {
  const location = useLocation()
  const currentPageName = pageNameMap[location.pathname] || 'Dashboard'

  return (
    <Layout currentPageName={currentPageName}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/stock-movements" element={<StockMovements />} />
        <Route path="/supplier-orders" element={<SupplierOrders />} />
        <Route path="/supplier-orders/details" element={<SupplierOrderDetails />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/details" element={<ShipmentDetails />} />
        <Route path="/inventory-adjustments" element={<InventoryAdjustments />} />
        <Route path="/inventory-adjustments/details" element={<InventoryAdjustmentDetails />} />
        <Route path="/product-costs" element={<ProductCosts />} />
        <Route path="/users-roles" element={<UsersRoles />} />
        <Route path="/reference-data" element={<ReferenceData />} />
      </Routes>
    </Layout>
  )
}

export default App
