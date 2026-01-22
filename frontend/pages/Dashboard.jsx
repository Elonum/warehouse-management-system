import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Package, 
  Warehouse, 
  Truck, 
  ShoppingCart, 
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export default function Dashboard() {
  
  
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
      const response = await api.stock.getCurrent({});
      return Array.isArray(response) ? response : [];
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

  const isLoading = loadingProducts || loadingWarehouses || loadingStock || loadingOrders || loadingShipments || loadingMovements;

  // Calculate stats
  const totalStockQty = stock.reduce((sum, s) => sum + (s.currentQuantity || 0), 0);
  const totalProducts = products.length;

  const activeOrders = supplierOrders.filter(o => o.statusId != null).length;
  const activeShipments = shipments.filter(s => s.statusId != null).length;

  // Stock by warehouse data
  const stockByWarehouse = warehouses.map(wh => ({
    name: wh.name,
    quantity: stock.filter(s => s.warehouseId === wh.warehouseId).reduce((sum, s) => sum + (s.currentQuantity || 0), 0),
  })).filter(item => item.quantity > 0);

  const orderStatusNameById = new Map(orderStatuses.map(s => [s.orderStatusId, s.name]));
  const ordersByStatus = orderStatuses.map(s => ({
    status: s.name,
    count: supplierOrders.filter(o => o.statusId === s.orderStatusId).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Панель управления" 
        description="Обзор складских операций"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Остатки (всего)"
              value={`${totalStockQty.toLocaleString('ru-RU')} шт.`}
              icon={Boxes}
              variant="indigo"
            />
            <StatCard
              title="Всего товаров"
              value={totalProducts}
              icon={Package}
            />
            <StatCard
              title="Активных заказов"
              value={activeOrders}
              icon={Truck}
            />
            <StatCard
              title="Активных отгрузок"
              value={activeShipments}
              icon={ShoppingCart}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Stock by Warehouse */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Warehouse className="w-5 h-5 text-indigo-500" />
              Остатки по складам (шт.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStock || loadingWarehouses ? (
              <Skeleton className="w-full h-64" />
            ) : stockByWarehouse.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockByWarehouse} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
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
                    formatter={(value) => [`${Number(value).toLocaleString('ru-RU')} шт.`, 'Остаток']}
                    contentStyle={{ 
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e2e8f0)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                Нет данных
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="w-5 h-5 text-purple-500" />
              Заказы по статусам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <Skeleton className="w-full h-64" />
            ) : (
              <div className="flex items-center h-64">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus.filter(o => o.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {ordersByStatus.filter(o => o.count > 0).map((entry, index) => (
                        <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {ordersByStatus.filter(o => o.count > 0).map((item, index) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
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

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Последние изменения остатков
            </CardTitle>
            <Link 
              to={createPageUrl('StockMovements')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Все
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
                          {product?.article || `Товар #${snapshot.productId}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {warehouse?.name || `Склад #${snapshot.warehouseId}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        'text-slate-900 dark:text-slate-100'
                      }`}>
                        {snapshot.quantity?.toLocaleString('ru-RU') || 0} шт.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {snapshot.snapshotDate ? format(new Date(snapshot.snapshotDate), 'dd.MM') : ''}
                      </p>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500">
                Нет движений
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5 text-blue-500" />
              Последние заказы
            </CardTitle>
            <Link 
              to={createPageUrl('SupplierOrders')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Все
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
              <div className="flex items-center justify-center h-32 text-slate-500">
                Нет заказов
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}