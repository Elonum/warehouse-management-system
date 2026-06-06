import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Truck,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
  X,
  Eye,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuardedButton, GuardedMenuItem } from '@/components/auth/PermissionControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import ServerPaginationFooter from '@/components/ui/ServerPaginationFooter';
import { CLIENT_TABLE_PAGE_SIZES } from '@/lib/pagination/constants';

function SupplierOrdersTable({
  t,
  language,
  orders,
  orderStatuses,
  isLoading,
  getOrderStatusName,
  isOrderFinal,
  canCreateOrder = false,
  canEditOrder = false,
  canCreateSubOrder = false,
  canDeleteOrder = false,
  onCreateOrder,
  onEditOrder,
  onCreateSubOrder,
  onRequestDelete,
}) {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ field: 'orderNumber', direction: 'desc' });
  const [expandedOrders, setExpandedOrders] = useState({});

  const moneyLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const weightUnit = language === 'en' ? 'kg' : 'кг';

  const formatMoney = (value) => {
    if (value == null) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num.toLocaleString(moneyLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parentOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []).filter((o) => !o.parentOrderId),
    [orders],
  );

  const childOrdersMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(orders) ? orders : []).forEach((order) => {
      if (order.parentOrderId) {
        if (!map.has(order.parentOrderId)) {
          map.set(order.parentOrderId, []);
        }
        map.get(order.parentOrderId).push(order);
      }
    });
    return map;
  }, [orders]);

  const getStatusFilterLabel = () => {
    if (statusFilter === 'all') {
      return t('supplierOrders.filters.allStatuses');
    }
    const status = orderStatuses.find(
      (s) => String(s.orderStatusId) === String(statusFilter),
    );
    return status?.name || t('supplierOrders.filters.allStatuses');
  };

  const filteredParentOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const filtered = parentOrders.filter((order) => {
      if (statusFilter !== 'all') {
        if (!order.statusId || String(order.statusId) !== statusFilter) {
          return false;
        }
      }
      if (!searchValue) return true;
      const orderNumber = (order.orderNumber || '').toLowerCase();
      const buyer = (order.buyer || '').toLowerCase();
      return orderNumber.includes(searchValue) || buyer.includes(searchValue);
    });

    const sorted = [...filtered];
    if (sortConfig?.field) {
      const { field, direction } = sortConfig;
      const factor = direction === 'asc' ? 1 : -1;

      const getValue = (order) => {
        switch (field) {
          case 'orderNumber':
            return (order.orderNumber || '').toLowerCase();
          case 'buyer':
            return (order.buyer || '').toLowerCase();
          case 'status':
            return getOrderStatusName(order.statusId).toLowerCase();
          case 'purchaseDate':
            return order.purchaseDate ? new Date(order.purchaseDate).getTime() : 0;
          case 'plannedReceiptDate':
            return order.plannedReceiptDate
              ? new Date(order.plannedReceiptDate).getTime()
              : 0;
          case 'actualReceiptDate':
            return order.actualReceiptDate
              ? new Date(order.actualReceiptDate).getTime()
              : 0;
          case 'logisticsTotal':
            return Number(order.logisticsTotal) || 0;
          case 'totalAmount': {
            const logisticsTotal = Number(order.logisticsTotal) || 0;
            const itemsCost = Number(order.orderItemCost) || 0;
            return logisticsTotal + itemsCost;
          }
          case 'totalQty':
            return Number(order.totalQty) || 0;
          default:
            return 0;
        }
      };

      sorted.sort((a, b) => {
        const av = getValue(a);
        const bv = getValue(b);
        if (typeof av === 'string' && typeof bv === 'string') {
          return av.localeCompare(bv) * factor;
        }
        if (av < bv) return -1 * factor;
        if (av > bv) return 1 * factor;
        return 0;
      });
    }

    return sorted;
  }, [parentOrders, search, statusFilter, sortConfig, getOrderStatusName]);

  const {
    page,
    pageSize: ordersPageSize,
    setPage,
    setPageSize,
    totalPages: ordersTotalPages,
    goToFirst,
    goToLast,
    goToNext,
    goToPrevious,
    goToPage,
    range: ordersRange,
  } = usePagination({
    totalItems: filteredParentOrders.length,
    initialPage: 1,
    initialPageSize: 10,
  });

  const paginatedParentOrders = useMemo(
    () =>
      filteredParentOrders.slice(
        (page - 1) * ordersPageSize,
        page * ordersPageSize,
      ),
    [filteredParentOrders, page, ordersPageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortConfig.field, sortConfig.direction, setPage]);

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { field, direction: 'asc' };
    });
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const OrderRow = ({ order, isChild = false }) => {
    const hasChildren =
      childOrdersMap.has(order.orderId) && childOrdersMap.get(order.orderId).length > 0;
    const isExpanded = !!expandedOrders[order.orderId];

    const handleRowDoubleClick = () => {
      navigate(`${createPageUrl('SupplierOrderDetails')}?id=${order.orderId}`);
    };

    return (
      <>
        <tr
          className={`border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
            isChild ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
          }`}
          onDoubleClick={handleRowDoubleClick}
        >
          <td className="px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => toggleExpanded(order.orderId)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              )}
              {isChild && <div className="w-6" />}
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isChild
                      ? 'bg-purple-100 dark:bg-purple-500/20'
                      : 'bg-indigo-100 dark:bg-indigo-500/20'
                  }`}
                >
                  <Truck
                    className={`h-5 w-5 ${
                      isChild
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {order.orderNumber}
                  </p>
                  {isChild && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('supplierOrders.subOrder')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            {order.buyer || '—'}
          </td>
          <td className="px-4 py-3 text-sm">
            <StatusBadge
              status={getOrderStatusName(order.statusId)}
              className={
                isOrderFinal(order)
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : ''
              }
            />
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            {order.purchaseDate
              ? format(new Date(order.purchaseDate), 'dd.MM.yyyy')
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            {order.plannedReceiptDate
              ? format(new Date(order.plannedReceiptDate), 'dd.MM.yyyy')
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            {order.actualReceiptDate
              ? format(new Date(order.actualReceiptDate), 'dd.MM.yyyy')
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex flex-col gap-1">
              <span>
                {t('supplierOrders.form.logisticsChinaMsk')}:{' '}
                {formatMoney(order.logisticsChinaMsk)
                  ? `${formatMoney(order.logisticsChinaMsk)} ₽`
                  : '—'}
              </span>
              <span>
                {t('supplierOrders.form.logisticsMskKzn')}:{' '}
                {formatMoney(order.logisticsMskKzn)
                  ? `${formatMoney(order.logisticsMskKzn)} ₽`
                  : '—'}
              </span>
              <span>
                {t('supplierOrders.form.logisticsAdditional')}:{' '}
                {formatMoney(order.logisticsAdditional)
                  ? `${formatMoney(order.logisticsAdditional)} ₽`
                  : '—'}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t('supplierOrders.form.logisticsTotal')}:{' '}
                {formatMoney(order.logisticsTotal)
                  ? `${formatMoney(order.logisticsTotal)} ₽`
                  : '—'}
              </span>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t('supplierOrders.summary.positionsLabel')}:{' '}
                {order.positionsQty ?? 0}
              </span>
              <span>
                {t('supplierOrders.summary.quantityLabel')}:{' '}
                {order.totalQty ?? 0} {t('supplierOrders.summary.units')}
              </span>
              <span>
                {t('supplierOrders.summary.weightLabel')}:{' '}
                {order.orderItemWeight
                  ? `${order.orderItemWeight.toFixed(2)} ${weightUnit}`
                  : '—'}
              </span>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex flex-col gap-1">
              {(() => {
                const logisticsTotal = Number(order.logisticsTotal) || 0;
                const itemsCost = Number(order.orderItemCost) || 0;
                const total = logisticsTotal + itemsCost;
                const logisticsText = formatMoney(logisticsTotal);
                const itemsText = formatMoney(itemsCost);
                const totalText = formatMoney(total);
                return (
                  <>
                    <span>
                      {t('supplierOrders.summary.logistics')}:{' '}
                      {logisticsText ? `${logisticsText} ₽` : '—'}
                    </span>
                    <span>
                      {t('supplierOrders.summary.items')}:{' '}
                      {itemsText ? `${itemsText} ₽` : '—'}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t('supplierOrders.summary.total')}:{' '}
                      {totalText ? `${totalText} ₽` : '—'}
                    </span>
                  </>
                );
              })()}
            </div>
          </td>
          <td className="px-4 py-3 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`${createPageUrl('SupplierOrderDetails')}?id=${order.orderId}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    {t('common.details')}
                  </Link>
                </DropdownMenuItem>
                {!isOrderFinal(order) ? (
                  <>
                    <GuardedMenuItem allowed={canEditOrder} onClick={() => onEditOrder(order)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </GuardedMenuItem>
                    {!isChild ? (
                      <GuardedMenuItem allowed={canCreateSubOrder} onClick={() => onCreateSubOrder(order)}>
                        <Copy className="w-4 h-4 mr-2" />
                        {t('supplierOrders.createSubOrder')}
                      </GuardedMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <GuardedMenuItem
                      allowed={canDeleteOrder}
                      onClick={() => onRequestDelete(order)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete')}
                    </GuardedMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {hasChildren &&
          isExpanded &&
          childOrdersMap.get(order.orderId).map((child) => (
            <OrderRow key={child.orderId} order={child} isChild />
          ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('supplierOrders.title')}
        description={t('supplierOrders.description')}
      >
        <GuardedButton allowed={canCreateOrder} onClick={onCreateOrder}>
          <Plus className="w-4 h-4 mr-2" />
          {t('supplierOrders.addOrder')}
        </GuardedButton>
      </PageHeader>

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('supplierOrders.filters.title')}
              </span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-56"
                aria-label={t('supplierOrders.filters.statusesLabel')}
              >
                <SelectValue>{getStatusFilterLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('supplierOrders.filters.allStatuses')}
                </SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem
                    key={status.orderStatusId}
                    value={status.orderStatusId.toString()}
                  >
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full min-w-0 flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('supplierOrders.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

      <div className="overflow-x-auto rounded-lg border bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <LoadingState className="px-4 py-12" />
        ) : (
          <>
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800">
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('orderNumber')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.orderNumber')}
                    {sortConfig.field === 'orderNumber' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('buyer')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.buyer')}
                    {sortConfig.field === 'buyer' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.status')}
                    {sortConfig.field === 'status' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('purchaseDate')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.purchaseDate')}
                    {sortConfig.field === 'purchaseDate' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('plannedReceiptDate')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.plannedReceipt')}
                    {sortConfig.field === 'plannedReceiptDate' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('actualReceiptDate')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.actualReceipt')}
                    {sortConfig.field === 'actualReceiptDate' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('logisticsTotal')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.cost')}
                    {sortConfig.field === 'logisticsTotal' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('totalQty')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.quantity')}
                    {sortConfig.field === 'totalQty' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center gap-2">
                    {t('supplierOrders.table.amount')}
                    {sortConfig.field === 'totalAmount' && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300" />
              </tr>
            </thead>
            <tbody>
              {filteredParentOrders.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      className="px-4 py-12"
                      message={t('supplierOrders.emptyMessage')}
                    />
                  </td>
                </tr>
              ) : (
                paginatedParentOrders.map((order) => (
                  <OrderRow key={order.orderId} order={order} />
                ))
              )}
            </tbody>
          </table>
          {filteredParentOrders.length > 0 ? (
            <ServerPaginationFooter
              page={page}
              totalPages={ordersTotalPages}
              totalRows={filteredParentOrders.length}
              pageSize={ordersPageSize}
              pageSizeOptions={CLIENT_TABLE_PAGE_SIZES}
              from={ordersRange.from}
              to={ordersRange.to}
              pageRowCount={paginatedParentOrders.length}
              isLoading={isLoading}
              onPrev={goToPrevious}
              onNext={goToNext}
              onFirst={goToFirst}
              onLast={goToLast}
              onPageSelect={goToPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              ariaLabel={t('common.pagination.navLabel')}
            />
          ) : null}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default SupplierOrdersTable;

