import React, { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { I18nProvider, useI18n } from '@/lib/i18n'
import Layout from '../layout.jsx'
import Login from '../pages/Login'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Dashboard from '../pages/Dashboard'
import Products from '../pages/Products'
import Warehouses from '../pages/Warehouses'
import Stock from '../pages/Stock'
import StockSnapshots from '../pages/StockSnapshots'
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
import { api } from '@/api'
import { canAccessRoute, routeNavKey } from '@/lib/rbac'
import { useAuthProfile } from '@/hooks/useAuthProfile'
import { AccessDenied } from '@/components/auth/AccessDenied'

const pageNameMap = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/warehouses': 'Warehouses',
  '/stock': 'Stock',
  '/stock-snapshots': 'StockSnapshots',
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

function currentPageNameFromPath(pathname) {
  return pageNameMap[pathname] || 'Dashboard';
}

function ProtectedRoute({ children }) {
  const { t } = useI18n();
  const token = localStorage.getItem('auth_token')
  const { data: user, isLoading } = useAuthProfile()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (!user) {
    localStorage.removeItem('auth_token')
    return <Navigate to="/login" replace />
  }

  return children
}

function PermissionRoute({ path, children }) {
  const { t } = useI18n()
  const { data: user, isLoading } = useAuthProfile()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (!canAccessRoute(user, path)) {
    return (
      <AccessDenied
        navKey={routeNavKey(path)}
        roleName={user?.roleName}
      />
    )
  }

  return children
}

function App() {
  const location = useLocation()
  const currentPageName = currentPageNameFromPath(location.pathname)

  return (
    <I18nProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout currentPageName={currentPageName}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<PermissionRoute path="/products"><Products /></PermissionRoute>} />
                  <Route path="/products/details" element={<PermissionRoute path="/products/details"><Products /></PermissionRoute>} />
                  <Route path="/warehouses" element={<PermissionRoute path="/warehouses"><Warehouses /></PermissionRoute>} />
                  <Route path="/warehouses/details" element={<PermissionRoute path="/warehouses/details"><Warehouses /></PermissionRoute>} />
                  <Route path="/stock" element={<PermissionRoute path="/stock"><Stock /></PermissionRoute>} />
                  <Route path="/stock-snapshots" element={<PermissionRoute path="/stock-snapshots"><StockSnapshots /></PermissionRoute>} />
                  <Route path="/stock-movements" element={<PermissionRoute path="/stock-movements"><StockMovements /></PermissionRoute>} />
                  <Route path="/supplier-orders" element={<PermissionRoute path="/supplier-orders"><SupplierOrders /></PermissionRoute>} />
                  <Route path="/supplier-orders/details" element={<PermissionRoute path="/supplier-orders/details"><SupplierOrderDetails /></PermissionRoute>} />
                  <Route path="/shipments" element={<PermissionRoute path="/shipments"><Shipments /></PermissionRoute>} />
                  <Route path="/shipments/details" element={<PermissionRoute path="/shipments/details"><ShipmentDetails /></PermissionRoute>} />
                  <Route path="/inventory-adjustments" element={<PermissionRoute path="/inventory-adjustments"><InventoryAdjustments /></PermissionRoute>} />
                  <Route path="/inventory-adjustments/details" element={<PermissionRoute path="/inventory-adjustments/details"><InventoryAdjustmentDetails /></PermissionRoute>} />
                  <Route path="/product-costs" element={<PermissionRoute path="/product-costs"><ProductCosts /></PermissionRoute>} />
                  <Route path="/users-roles" element={<PermissionRoute path="/users-roles"><UsersRoles /></PermissionRoute>} />
                  <Route path="/reference-data" element={<PermissionRoute path="/reference-data"><ReferenceData /></PermissionRoute>} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </I18nProvider>
  )
}

export default App
