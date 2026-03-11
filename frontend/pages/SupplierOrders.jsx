import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import SupplierOrdersTable from '@/features/supplierOrders/components/SupplierOrdersTable';

const sanitizeMoneyInput = (value) => {
  if (value == null) return '';
  // Нормализуем разделитель: запятая → точка, убираем посторонние символы
  let v = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
  if (v === '') return '';

  // Разрешаем только одну точку: всё после первой точки сливаем в дробную часть
  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }

  // Фиксируем, был ли введён разделитель в конце (например, "10.")
  const endsWithDot = v.endsWith('.');

  let [intPart, fracPart] = v.split('.');

  // Ограничиваем длину целой части
  intPart = intPart ? intPart.slice(0, 12) : '';

  // Ограничиваем длину дробной части до двух знаков
  if (fracPart != null) {
    fracPart = fracPart.slice(0, 2);
  }

  // Если пользователь только что ввёл точку в конце — сохраняем её
  if (endsWithDot && (fracPart == null || fracPart === '')) {
    return intPart === '' ? '0.' : `${intPart}.`;
  }

  // Обычный случай: есть и целая и дробная часть
  if (fracPart != null && fracPart !== '') {
    return `${intPart}.${fracPart}`;
  }

  // Только целая часть
  return intPart;
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
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteErrorDialogOpen, setDeleteErrorDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [formData, setFormData] = useState(emptyOrder);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [error, setError] = useState('');
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
    orderStatuses.forEach(s => {
      map.set(s.orderStatusId, s);
    });
    return map;
  }, [orderStatuses]);

  const getOrderStatusName = (statusId) => {
    if (!statusId) return '—';
    const status = orderStatusesMap.get(statusId);
    return status?.name || '—';
  };

  const isOrderFinal = (order) => {
    if (!order?.statusId) return false;
    const status = orderStatusesMap.get(order.statusId);
    return !!status?.isFinal;
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
        if (err.code === 'ORDER_COMPLETED') {
          message = t('supplierOrderDetails.errors.cannotDeleteCompleted');
        }
        if (err.code === 'ORDER_HAS_SUB_ORDERS') {
          message = t('supplierOrders.errors.hasSubOrders');
        }
        setDeleteError(message);
        setDeleteErrorDialogOpen(true);
      } else {
        setDeleteError(t('supplierOrders.errors.deleteFailed'));
        setDeleteErrorDialogOpen(true);
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...emptyOrder,
      // Номер заказа теперь генерируется на бэкенде, поэтому при создании
      // мы показываем пустое поле/подсказку, а при редактировании — фактический номер.
      orderNumber: '',
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
    if (isOrderFinal(order)) {
      setError(t('supplierOrderDetails.errors.cannotEditCompleted'));
      return;
    }
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
    // Для подзаказов используем единый UX: детальная страница заказа
    // с специализированным диалогом переноса позиций в подзаказ.
    navigate(`${createPageUrl('SupplierOrderDetails')}?id=${parentOrder.orderId}&suborder=1`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

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
      // orderNumber генерируется на сервере; фронтенд его не задаёт.
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

  return (
    <div className="space-y-6">
      <SupplierOrdersTable
        t={t}
        language={language}
        orders={orders}
        orderStatuses={orderStatuses}
        isLoading={isLoading}
        getOrderStatusName={getOrderStatusName}
        isOrderFinal={isOrderFinal}
        onCreateOrder={() => {
          resetForm();
          setDialogOpen(true);
        }}
        onEditOrder={handleEdit}
        onCreateSubOrder={handleCreateSubOrder}
        onRequestDelete={(order) => {
          if (isOrderFinal(order)) {
            setDeleteError(t('supplierOrderDetails.errors.cannotDeleteCompleted'));
            setDeleteErrorDialogOpen(true);
            return;
          }
          setCurrentOrder(order);
          setDeleteError('');
          setDeleteDialogOpen(true);
        }}
      />

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
              <Label htmlFor="orderNumber">{t('supplierOrders.form.orderNumber')}</Label>
              <Input
                id="orderNumber"
                value={currentOrder ? (currentOrder.orderNumber || '') : t('supplierOrders.form.orderNumberAuto')}
                readOnly
                disabled
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

      {/* Delete Error Dialog */}
      <AlertDialog open={deleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('supplierOrders.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteErrorDialogOpen(false);
                setDeleteError('');
              }}
            >
              {t('common.ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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