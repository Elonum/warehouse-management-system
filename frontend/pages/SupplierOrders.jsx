import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Truck, 
  MoreHorizontal, 
  Eye,
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const sanitizeMoneyInput = (value) => {
  if (!value) return '';
  let v = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }
  let [intPart, fracPart] = v.split('.');
  intPart = intPart ? intPart.slice(0, 12) : '';
  if (fracPart != null) {
    fracPart = fracPart.slice(0, 2);
  }
  return fracPart != null && fracPart !== '' ? `${intPart}.${fracPart}` : intPart;
};

const emptyOrder = {
  orderNumber: '',
  buyer: null,
  statusId: null,
  purchaseDate: null,
  plannedReceiptDate: null,
  actualReceiptDate: null,
  logisticsChinaMsk: null,
  logisticsMskKzn: null,
  logisticsAdditional: null,
  logisticsTotal: null,
  orderItemCost: null,
  positionsQty: 0,
  totalQty: 0,
  orderItemWeight: null,
  parentOrderId: null,
};

export default function SupplierOrders() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [formData, setFormData] = useState(emptyOrder);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: ordersData, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: async () => {
      const response = await api.supplierOrders.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: orderStatusesData } = useQuery({
    queryKey: ['orderStatuses'],
    queryFn: async () => {
      const response = await api.orderStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];
  const orderStatuses = Array.isArray(orderStatusesData) ? orderStatusesData : [];

  const orderStatusesMap = useMemo(() => {
    const map = new Map();
    orderStatuses.forEach(s => map.set(s.orderStatusId, s.name));
    return map;
  }, [orderStatuses]);

  const getOrderStatusName = (statusId) => {
    if (!statusId) return '—';
    return orderStatusesMap.get(statusId) || '—';
  };

  // Group orders by parent
  const parentOrders = orders.filter(o => !o.parentOrderId);
  const childOrdersMap = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      if (order.parentOrderId) {
        if (!map.has(order.parentOrderId)) {
          map.set(order.parentOrderId, []);
        }
        map.get(order.parentOrderId).push(order);
      }
    });
    return map;
  }, [orders]);

  const filteredParentOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return parentOrders.filter(order => {
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
  }, [parentOrders, search, statusFilter]);

  const getStatusFilterLabel = () => {
    if (statusFilter === 'all') {
      return t('supplierOrders.filters.allStatuses');
    }
    const status = orderStatuses.find((s) => String(s.orderStatusId) === String(statusFilter));
    return status?.name || t('supplierOrders.filters.allStatuses');
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.supplierOrders.create(data),
    onSuccess: async () => {
      setDialogOpen(false);
      resetForm();
      setError('');
      await refetchOrders();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('supplierOrders.errors.createFailed');
        if (err.code === 'INVALID_REQUEST' && err.message?.includes('orderNumber is required')) {
          message = t('supplierOrders.form.orderNumberRequired');
        }
        if (err.code === 'ORDER_EXISTS') {
          message = t('supplierOrders.errors.orderExists');
        }
        if (err.code === 'ORDER_STATUS_NOT_FOUND') {
          message = t('supplierOrders.errors.statusNotFound');
        }
        if (err.code === 'INVALID_DATE_RANGE') {
          message = t('supplierOrders.errors.invalidDateRange');
        }
        setError(message);
      } else {
        setError(t('supplierOrders.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.supplierOrders.update(id, data),
    onSuccess: async () => {
      setDialogOpen(false);
      resetForm();
      setError('');
      await refetchOrders();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('supplierOrders.errors.updateFailed');
        if (err.code === 'INVALID_REQUEST' && err.message?.includes('orderNumber is required')) {
          message = t('supplierOrders.form.orderNumberRequired');
        }
        if (err.code === 'ORDER_EXISTS') {
          message = t('supplierOrders.errors.orderExists');
        }
        if (err.code === 'ORDER_STATUS_NOT_FOUND') {
          message = t('supplierOrders.errors.statusNotFound');
        }
        if (err.code === 'INVALID_PARENT_ORDER') {
          message = t('supplierOrders.errors.invalidParentOrder');
        }
        if (err.code === 'INVALID_DATE_RANGE') {
          message = t('supplierOrders.errors.invalidDateRange');
        }
        if (err.code === 'ORDER_NOT_FOUND') {
          message = t('supplierOrders.errors.notFound');
        }
        setError(message);
      } else {
        setError(t('supplierOrders.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.supplierOrders.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['supplierOrders'] });
      const previousData = queryClient.getQueryData(['supplierOrders']);
      
      queryClient.setQueryData(['supplierOrders'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((order) => order.orderId !== deletedId);
      });
      
      return { previousData };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setCurrentOrder(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      await refetchOrders();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['supplierOrders'], context.previousData);
      }
      if (err instanceof ApiError) {
        let message = err.message || t('supplierOrders.errors.deleteFailed');
        if (err.code === 'ORDER_NOT_FOUND') {
          message = t('supplierOrders.errors.notFound');
        }
        setError(message);
      } else {
        setError(t('supplierOrders.errors.deleteFailed'));
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...emptyOrder,
      purchaseDate: today,
    });
    setCurrentOrder(null);
    setError('');
  };

  const calculateLogisticsTotal = useCallback((chinaMsk, mskKzn, additional) => {
    const c = chinaMsk ? parseFloat(chinaMsk) : 0;
    const m = mskKzn ? parseFloat(mskKzn) : 0;
    const a = additional ? parseFloat(additional) : 0;
    const total = c + m + a;
    return Number.isFinite(total) ? total : null;
  }, []);

  const handleEdit = (order) => {
    setCurrentOrder(order);
    setFormData({
      orderNumber: order.orderNumber || '',
      buyer: order.buyer || null,
      statusId: order.statusId || null,
      purchaseDate: order.purchaseDate ? format(new Date(order.purchaseDate), 'yyyy-MM-dd') : null,
      plannedReceiptDate: order.plannedReceiptDate ? format(new Date(order.plannedReceiptDate), 'yyyy-MM-dd') : null,
      actualReceiptDate: order.actualReceiptDate ? format(new Date(order.actualReceiptDate), 'yyyy-MM-dd') : null,
      logisticsChinaMsk: order.logisticsChinaMsk || null,
      logisticsMskKzn: order.logisticsMskKzn || null,
      logisticsAdditional: order.logisticsAdditional || null,
      logisticsTotal: order.logisticsTotal || null,
      parentOrderId: order.parentOrderId || null,
    });
    setDialogOpen(true);
  };

  const handleCreateSubOrder = (parentOrder) => {
    setCurrentOrder(null);
    setFormData({
      orderNumber: `${parentOrder.orderNumber}-SUB`,
      buyer: parentOrder.buyer || null,
      statusId: parentOrder.statusId || null,
      purchaseDate: parentOrder.purchaseDate ? format(new Date(parentOrder.purchaseDate), 'yyyy-MM-dd') : null,
      plannedReceiptDate: parentOrder.plannedReceiptDate ? format(new Date(parentOrder.plannedReceiptDate), 'yyyy-MM-dd') : null,
      actualReceiptDate: null,
      logisticsChinaMsk: parentOrder.logisticsChinaMsk || null,
      logisticsMskKzn: parentOrder.logisticsMskKzn || null,
      logisticsAdditional: parentOrder.logisticsAdditional || null,
      logisticsTotal: parentOrder.logisticsTotal || null,
      parentOrderId: parentOrder.orderId,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const orderNumber = formData.orderNumber.trim();
    if (!orderNumber) {
      setError(t('supplierOrders.form.orderNumberRequired'));
      return;
    }

    if (!formData.statusId) {
      setError(t('supplierOrders.form.statusRequired'));
      return;
    }

    const buyerTrimmed = (formData.buyer || '').trim();
    if (!buyerTrimmed) {
      setError(t('supplierOrders.form.buyerRequired'));
      return;
    }

    const logisticsTotalCalc = calculateLogisticsTotal(
      formData.logisticsChinaMsk,
      formData.logisticsMskKzn,
      formData.logisticsAdditional
    );

    const data = {
      orderNumber,
      buyer: buyerTrimmed || null,
      statusId: formData.statusId || null,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
      plannedReceiptDate: formData.plannedReceiptDate ? new Date(formData.plannedReceiptDate).toISOString() : null,
      actualReceiptDate: formData.actualReceiptDate ? new Date(formData.actualReceiptDate).toISOString() : null,
      logisticsChinaMsk: formData.logisticsChinaMsk ? parseFloat(formData.logisticsChinaMsk) : null,
      logisticsMskKzn: formData.logisticsMskKzn ? parseFloat(formData.logisticsMskKzn) : null,
      logisticsAdditional: formData.logisticsAdditional ? parseFloat(formData.logisticsAdditional) : null,
      logisticsTotal: formData.logisticsTotal
        ? parseFloat(formData.logisticsTotal)
        : logisticsTotalCalc,
      parentOrderId: formData.parentOrderId || null,
    };

    if (currentOrder) {
      updateMutation.mutate({ id: currentOrder.orderId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const OrderRow = ({ order, isChild = false }) => {
    const hasChildren = childOrdersMap.has(order.orderId) && childOrdersMap.get(order.orderId).length > 0;
    const isExpanded = expandedOrders[order.orderId];

    const handleRowDoubleClick = () => {
      navigate(`${createPageUrl('SupplierOrderDetails')}?id=${order.orderId}`);
    };

    return (
      <>
        <tr
          className={`border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${isChild ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
          onDoubleClick={handleRowDoubleClick}
        >
          <td className="px-4 py-3">
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
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isChild ? 'bg-purple-100 dark:bg-purple-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
                  <Truck className={`h-5 w-5 ${isChild ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {order.orderNumber}
                  </p>
                  {isChild && (
                    <p className="text-xs text-slate-500">Подзаказ</p>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
            {order.buyer || '—'}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={getOrderStatusName(order.statusId)} />
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
            {order.purchaseDate ? format(new Date(order.purchaseDate), 'dd.MM.yyyy') : '—'}
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
            {order.plannedReceiptDate ? format(new Date(order.plannedReceiptDate), 'dd.MM.yyyy') : '—'}
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
            {order.actualReceiptDate ? format(new Date(order.actualReceiptDate), 'dd.MM.yyyy') : '—'}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <span>Китай-Мск: {order.logisticsChinaMsk ? `${order.logisticsChinaMsk.toFixed(2)} ₽` : '—'}</span>
              <span>Мск-Кзн: {order.logisticsMskKzn ? `${order.logisticsMskKzn.toFixed(2)} ₽` : '—'}</span>
              <span>Доп.: {order.logisticsAdditional ? `${order.logisticsAdditional.toFixed(2)} ₽` : '—'}</span>
              <span className="font-semibold">Итого: {order.logisticsTotal ? `${order.logisticsTotal.toFixed(2)} ₽` : '—'}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">
                Позиции: {order.positionsQty ?? 0}
              </span>
              <span className="text-sm text-slate-500">
                Всего: {order.totalQty ?? 0} шт.
              </span>
              <span className="text-sm text-slate-500">
                Вес: {order.orderItemWeight ? `${order.orderItemWeight.toFixed(2)} г` : '—'}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
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
                <DropdownMenuItem onClick={() => handleEdit(order)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                {!isChild && (
                  <DropdownMenuItem onClick={() => handleCreateSubOrder(order)}>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('supplierOrders.createSubOrder')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { setCurrentOrder(order); setDeleteDialogOpen(true); }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {hasChildren && isExpanded && childOrdersMap.get(order.orderId).map(child => (
          <OrderRow key={child.orderId} order={child} isChild={true} />
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
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('supplierOrders.addOrder')}
        </Button>
      </PageHeader>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <span>{t('supplierOrders.filters.statusesLabel')}</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56 h-8">
              <SelectValue>
                {getStatusFilterLabel()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('supplierOrders.filters.allStatuses')}</SelectItem>
              {orderStatuses.map((status) => (
                <SelectItem key={status.orderStatusId} value={status.orderStatusId.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t('supplierOrders.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-slate-500">
            {t('common.loading')}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800">
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.orderNumber')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.buyer')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.status')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.purchaseDate')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.plannedReceipt')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.actualReceipt')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.cost')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">{t('supplierOrders.table.quantity')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300"></th>
              </tr>
            </thead>
            <tbody>
              {filteredParentOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    {t('supplierOrders.emptyMessage')}
                  </td>
                </tr>
              ) : (
                filteredParentOrders.map(order => (
                  <OrderRow key={order.orderId} order={order} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentOrder ? t('supplierOrders.editOrder') : t('supplierOrders.addOrder')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">{t('supplierOrders.form.orderNumber')} *</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusId">{t('supplierOrders.form.status')} *</Label>
                <Select
                  value={formData.statusId ? formData.statusId.toString() : ''}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      statusId: value && value !== '' ? value : null 
                    });
                  }}
                >
                  <SelectTrigger id="statusId">
                    <SelectValue placeholder={t('supplierOrders.form.status')}>
                      {formData.statusId ? getOrderStatusName(formData.statusId) : ''}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.notSpecified')}</SelectItem>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.orderStatusId} value={status.orderStatusId.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">{t('supplierOrders.form.buyer')} *</Label>
              <Input
                id="buyer"
                value={formData.buyer || ''}
                onChange={(e) => setFormData({ ...formData, buyer: e.target.value || null })}
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">{t('supplierOrders.form.purchaseDate')}</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate || ''}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedReceiptDate">{t('supplierOrders.form.plannedReceiptDate')}</Label>
                <Input
                  id="plannedReceiptDate"
                  type="date"
                  value={formData.plannedReceiptDate || ''}
                  onChange={(e) => setFormData({ ...formData, plannedReceiptDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualReceiptDate">{t('supplierOrders.form.actualReceiptDate')}</Label>
                <Input
                  id="actualReceiptDate"
                  type="date"
                  value={formData.actualReceiptDate || ''}
                  onChange={(e) => setFormData({ ...formData, actualReceiptDate: e.target.value || null })}
                />
              </div>
            </div>
            {/* Aggregated fields (positions, quantity, cost, weight) рассчитываются на бэкенде и в деталях,
                поэтому здесь не редактируются и не отображаются, чтобы не вводить пользователя в заблуждение. */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logisticsChinaMsk">{t('supplierOrders.form.logisticsChinaMsk')}</Label>
                <Input
                  id="logisticsChinaMsk"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.logisticsChinaMsk || ''}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    const total = calculateLogisticsTotal(value, formData.logisticsMskKzn, formData.logisticsAdditional);
                    setFormData({ ...formData, logisticsChinaMsk: value || null, logisticsTotal: total });
                  }}
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logisticsMskKzn">{t('supplierOrders.form.logisticsMskKzn')}</Label>
                <Input
                  id="logisticsMskKzn"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.logisticsMskKzn || ''}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    const total = calculateLogisticsTotal(formData.logisticsChinaMsk, value, formData.logisticsAdditional);
                    setFormData({ ...formData, logisticsMskKzn: value || null, logisticsTotal: total });
                  }}
                  maxLength={18}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logisticsAdditional">{t('supplierOrders.form.logisticsAdditional')}</Label>
                <Input
                  id="logisticsAdditional"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.logisticsAdditional || ''}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    const total = calculateLogisticsTotal(formData.logisticsChinaMsk, formData.logisticsMskKzn, value);
                    setFormData({ ...formData, logisticsAdditional: value || null, logisticsTotal: total });
                  }}
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logisticsTotal">{t('supplierOrders.form.logisticsTotal')}</Label>
                <Input
                  id="logisticsTotal"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.logisticsTotal ?? ''}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    setFormData({ ...formData, logisticsTotal: value || null });
                  }}
                  maxLength={18}
                />
                <p className="text-xs text-slate-500">
                  {t('supplierOrders.form.logisticsTotalHint')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {currentOrder ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('supplierOrders.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('supplierOrders.deleteConfirm.description', { orderNumber: currentOrder?.orderNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate(currentOrder.orderId);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}