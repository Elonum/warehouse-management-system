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
  DollarSign,
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
    queryFn: () => api.entities.Product.list(),
  });

  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.entities.Stock.list(),
  });

  const { data: supplierOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn: () => api.entities.SupplierOrder.list('-created_date', 50),
  });

  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.entities.Shipment.list('-created_date', 50),
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['movements'],
    queryFn: () => api.entities.StockMovement.list('-movement_date', 10),
  });

  const isLoading = loadingProducts || loadingWarehouses || loadingStock || loadingOrders || loadingShipments || loadingMovements;

  // Calculate stats
  const totalStockValue = stock.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const totalProducts = products.length;
  const activeOrders = supplierOrders.filter(o => !['received', 'cancelled'].includes(o.status)).length;
  const activeShipments = shipments.filter(s => !['accepted', 'cancelled'].includes(s.status)).length;

  // Stock by warehouse data
  const stockByWarehouse = warehouses.map(wh => ({
    name: wh.name,
    value: stock.filter(s => s.warehouse_id === wh.id).reduce((sum, s) => sum + (s.total_value || 0), 0),
    quantity: stock.filter(s => s.warehouse_id === wh.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
  })).filter(item => item.value > 0);

  // Orders by status
  const ordersByStatus = ['draft', 'pending', 'confirmed', 'in_transit', 'received'].map(status => ({
    status: status.replace('_', ' '),
    count: supplierOrders.filter(o => o.status === status).length
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
              title="Стоимость запасов"
              value={`$${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              variant="indigo"
              trend="up"
              trendValue="+12.5% за месяц"
            />
            <StatCard
              title="Всего товаров"
              value={totalProducts}
              subtitle={`${products.filter(p => p.status === 'active').length} активных`}
              icon={Package}
            />
            <StatCard
              title="Активных заказов"
              value={activeOrders}
              subtitle={`${supplierOrders.filter(o => o.status === 'in_transit').length} в пути`}
              icon={Truck}
            />
            <StatCard
              title="Активных отгрузок"
              value={activeShipments}
              subtitle={`${shipments.filter(s => s.status === 'shipped').length} отправлено`}
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
              Стоимость запасов по складам
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
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    className="text-slate-600 dark:text-slate-400"
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                    contentStyle={{ 
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e2e8f0)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
              Последние движения
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
            ) : movements.length > 0 ? (
              <div className="space-y-3">
                {movements.slice(0, 5).map(movement => (
                  <div 
                    key={movement.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        movement.movement_type === 'incoming' 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                          : movement.movement_type === 'outgoing'
                            ? 'bg-rose-100 dark:bg-rose-500/20'
                            : 'bg-amber-100 dark:bg-amber-500/20'
                      }`}>
                        {movement.movement_type === 'incoming' ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : movement.movement_type === 'outgoing' ? (
                          <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {movement.product_name || 'Product'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {movement.warehouse_name || 'Warehouse'} • {movement.source_number || movement.source_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        movement.quantity > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {movement.movement_date ? format(new Date(movement.movement_date), 'MMM d') : ''}
                      </p>
                    </div>
                  </div>
                ))}
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
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {order.supplier_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ${order.total?.toLocaleString() || '0'}
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