import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  ArrowUpRight,
  Boxes,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '@/api';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { createPageUrl } from '@/utils';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

const LOW_STOCK_DASHBOARD_LIMIT = 10;

export default function Dashboard() {
  const { t } = useI18n();
  
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['stock-current'],
    queryFn: async () => {
      const { items } = await api.stock.getCurrent({});
      return items;
    },
  });

  const { data: lowStockRows = [], isLoading: loadingLowStock } = useQuery({
    queryKey: ['stock-current-low', LOW_STOCK_DASHBOARD_LIMIT],
    queryFn: async () => {
      const { items } = await api.stock.getCurrent({
        levelFilter: 'below_reorder',
        limit: LOW_STOCK_DASHBOARD_LIMIT,
        offset: 0,
      });
      return items;
    },
  });

  const { data: supplierOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: async () => {
      const response = await api.supplierOrders.list({ limit: 50, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ['mpShipments'],
    queryFn: async () => {
      const response = await api.mpShipments.list({ limit: 50, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: orderStatuses = [] } = useQuery({
    queryKey: ['orderStatuses'],
    queryFn: async () => {
      const response = await api.orderStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: shipmentStatuses = [] } = useQuery({
    queryKey: ['shipmentStatuses'],
    queryFn: async () => {
      const response = await api.shipmentStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  // В проекте пока нет полноценного "журнала движений" (incoming/outgoing/transfer).
  // Для дашборда используем последние "снимки остатков" как историю изменений остатков.
  const { data: stockSnapshots = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['stockSnapshots'],
    queryFn: async () => {
      const response = await api.stockSnapshots.list({ limit: 10, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const isLoading =
    loadingProducts ||
    loadingWarehouses ||
    loadingStock ||
    loadingOrders ||
    loadingShipments ||
    loadingMovements;

  const stockLowLink = `${createPageUrl('Stock')}?levelFilter=below_reorder`;

  // Calculate stats
  const totalProducts = products.length;

  const mainWarehouses = useMemo(
    () => warehouses.filter((w) => !w?.isMarketplace),
    [warehouses],
  );

  const marketplaceWarehouses = useMemo(
    () => warehouses.filter((w) => w?.isMarketplace),
    [warehouses],
  );

  // Stock by warehouse data
  const stockByMainWarehouse = mainWarehouses
    .map((wh) => ({
      name: wh.name,
      quantity: stock
        .filter((s) => s.warehouseId === wh.warehouseId)
        .reduce((sum, s) => sum + (s.currentQuantity || 0), 0),
    }))
    .filter((item) => item.quantity > 0);

  const stockByMarketplaceWarehouse = marketplaceWarehouses
    .map((wh) => ({
      name: wh.name,
      quantity: stock
        .filter((s) => s.warehouseId === wh.warehouseId)
        .reduce((sum, s) => sum + (s.currentQuantity || 0), 0),
    }))
    .filter((item) => item.quantity > 0);

  const mainWarehouseIds = new Set(mainWarehouses.map((w) => w.warehouseId));
  const marketplaceWarehouseIds = new Set(
    marketplaceWarehouses.map((w) => w.warehouseId),
  );

  const mainStockQty = stock
    .filter((s) => mainWarehouseIds.has(s.warehouseId))
    .reduce((sum, s) => sum + (s.currentQuantity || 0), 0);

  const marketplaceStockQty = stock
    .filter((s) => marketplaceWarehouseIds.has(s.warehouseId))
    .reduce((sum, s) => sum + (s.currentQuantity || 0), 0);

  const totalStockQty = mainStockQty + marketplaceStockQty;

  const orderStatusNameById = new Map(
    orderStatuses.map((s) => [s.orderStatusId, s.name]),
  );
  const orderStatusFinalById = new Map(
    orderStatuses.map((s) => [s.orderStatusId, !!s.isFinal]),
  );
  const shipmentStatusFinalById = new Map(
    shipmentStatuses.map((s) => [s.shipmentStatusId, !!s.isFinal]),
  );

  const activeOrders = supplierOrders.filter(
    (o) => !orderStatusFinalById.get(o.statusId),
  ).length;
  const activeShipments = shipments.filter(
    (s) => !shipmentStatusFinalById.get(s.statusId),
  ).length;

  const ordersByStatus = orderStatuses.map(s => ({
    status: s.name,
    count: supplierOrders.filter(o => o.statusId === s.orderStatusId).length,
  }));

  const shipmentsByStatus = shipmentStatuses.map((s) => ({
    status: s.name,
    count: shipments.filter((sh) => sh.statusId === s.shipmentStatusId).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('dashboard.title')} 
        description={t('dashboard.description')}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title={t('dashboard.stats.totalStock')}
              value={`${totalStockQty.toLocaleString()} ${t('common.units')}`}
              icon={Boxes}
            />
            <StatCard
              title={t('dashboard.stats.mainStock')}
              value={`${mainStockQty.toLocaleString()} ${t('common.units')}`}
              icon={Warehouse}
              variant="indigo"
            />
            <StatCard
              title={t('dashboard.stats.marketplaceStock')}
              value={`${marketplaceStockQty.toLocaleString()} ${t('common.units')}`}
              icon={Warehouse}
              variant="emerald"
            />
            <StatCard
              title={t('dashboard.stats.totalProducts')}
              value={totalProducts}
              icon={Package}
            />
            <StatCard
              title={t('dashboard.stats.activeOrders')}
              value={activeOrders}
              icon={Truck}
            />
            <StatCard
              title={t('dashboard.stats.activeShipments')}
              value={activeShipments}
              icon={ShoppingCart}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Our warehouses: stock + orders */}
        <div className="space-y-6">
          {/* Stock by our warehouses */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Warehouse className="w-5 h-5 text-indigo-500" />
                {t('dashboard.charts.stockByMainWarehouse')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStock || loadingWarehouses ? (
                <Skeleton className="w-full h-64" />
              ) : stockByMainWarehouse.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={stockByMainWarehouse}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="text-slate-600 dark:text-slate-400"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}`}
                      className="text-slate-600 dark:text-slate-400"
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} ${t('common.units')}`,
                        t('dashboard.stock'),
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState className="h-64" message={t('common.noData')} />
              )}
            </CardContent>
          </Card>

          {/* Orders by Status */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="w-5 h-5 text-purple-500" />
                {t('dashboard.charts.ordersByStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <Skeleton className="w-full h-64" />
              ) : ordersByStatus.filter((o) => o.count > 0).length === 0 ? (
                <EmptyState className="h-64" message={t('common.noData')} />
              ) : (
                <div className="flex items-center h-64">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={ordersByStatus.filter((o) => o.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {ordersByStatus
                          .filter((o) => o.count > 0)
                          .map((entry, index) => (
                            <Cell
                              key={entry.status}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {ordersByStatus
                      .filter((o) => o.count > 0)
                      .map((item, index) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-sm capitalize text-slate-600 dark:text-slate-400">
                              {item.status}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MP warehouses: stock + shipments */}
        <div className="space-y-6">
          {/* Stock by MP Warehouses */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Warehouse className="w-5 h-5 text-emerald-500" />
                {t('dashboard.charts.stockByMarketplaceWarehouse')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStock || loadingWarehouses ? (
                <Skeleton className="w-full h-64" />
              ) : stockByMarketplaceWarehouse.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={stockByMarketplaceWarehouse}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="text-slate-600 dark:text-slate-400"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}`}
                      className="text-slate-600 dark:text-slate-400"
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} ${t('common.units')}`,
                        t('dashboard.stock'),
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState className="h-64" message={t('common.noData')} />
              )}
            </CardContent>
          </Card>

          {/* Shipments by Status */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                {t('dashboard.charts.shipmentsByStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingShipments ? (
                <Skeleton className="w-full h-64" />
              ) : shipmentsByStatus.filter((s) => s.count > 0).length === 0 ? (
                <EmptyState className="h-64" message={t('dashboard.shipments')} />
              ) : (
                <div className="flex items-center h-64">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={shipmentsByStatus.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {shipmentsByStatus
                          .filter((s) => s.count > 0)
                          .map((entry, index) => (
                            <Cell
                              key={entry.status}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {shipmentsByStatus
                      .filter((s) => s.count > 0)
                      .map((item, index) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-sm capitalize text-slate-600 dark:text-slate-400">
                              {item.status}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Low stock — operational shortcut to Stock with filters */}
      <Card className="dark:bg-slate-900 dark:border-slate-800 border-amber-200/80 dark:border-amber-500/25">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              {t('dashboard.lowStock.title')}
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.lowStock.subtitle')}
            </p>
          </div>
          <Link
            to={stockLowLink}
            className="flex shrink-0 items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {t('dashboard.lowStock.openStock')}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {loadingLowStock ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : lowStockRows.length === 0 ? (
            <EmptyState className="min-h-[8rem]" message={t('dashboard.lowStock.empty')} />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {lowStockRows.map((row) => {
                const product = products.find(
                  (p) => String(p.productId) === String(row.productId),
                );
                const warehouse = warehouses.find(
                  (w) => String(w.warehouseId) === String(row.warehouseId),
                );
                return (
                  <li
                    key={`${row.productId}-${row.warehouseId}`}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {product?.article || `${t('dashboard.product')} #${row.productId}`}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {warehouse?.name || `${t('dashboard.warehouse')} #${row.warehouseId}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right sm:pl-4">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {(row.currentQuantity ?? 0).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          / {row.reorderPoint ?? 0}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('dashboard.lowStock.qty')} / {t('dashboard.lowStock.reorder')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              {t('dashboard.charts.recentMovements')}
            </CardTitle>
            <Link 
              to={createPageUrl('StockMovements')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t('common.all')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingMovements ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : stockSnapshots.length > 0 ? (
              <div className="space-y-3">
                {stockSnapshots.slice(0, 5).map(snapshot => {
                  const product = products.find(p => p.productId === snapshot.productId);
                  const warehouse = warehouses.find(w => w.warehouseId === snapshot.warehouseId);
                  return (
                  <div 
                    key={snapshot.snapshotId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        'bg-amber-100 dark:bg-amber-500/20'
                      }`}>
                        <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {product?.article || `${t('dashboard.product')} #${snapshot.productId}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {warehouse?.name || `${t('dashboard.warehouse')} #${snapshot.warehouseId}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        'text-slate-900 dark:text-slate-100'
                      }`}>
                        {snapshot.quantity?.toLocaleString() || 0} {t('common.units')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {snapshot.snapshotDate ? format(new Date(snapshot.snapshotDate), 'dd.MM') : ''}
                      </p>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <EmptyState className="h-32" message={t('dashboard.movements')} />
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5 text-blue-500" />
              {t('dashboard.charts.recentOrders')}
            </CardTitle>
            <Link 
              to={createPageUrl('SupplierOrders')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t('common.all')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : supplierOrders.length > 0 ? (
              <div className="space-y-3">
                {supplierOrders.slice(0, 5).map(order => (
                  <div 
                    key={order.orderId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {order.buyer || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={orderStatusNameById.get(order.statusId) || '—'} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {order.orderItemCost ? `₽${order.orderItemCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState className="h-32" message={t('dashboard.orders')} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}