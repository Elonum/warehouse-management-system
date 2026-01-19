import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
        setError(err.message || 'Ошибка создания заказа');
      } else {
        setError('Ошибка создания заказа');
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
        setError(err.message || 'Ошибка обновления заказа');
      } else {
        setError('Ошибка обновления заказа');
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
        setError(err.message || 'Ошибка удаления заказа');
      } else {
        setError('Ошибка удаления заказа');
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData(emptyOrder);
    setCurrentOrder(null);
    setError('');
  };

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
      orderItemCost: order.orderItemCost || null,
      positionsQty: order.positionsQty || 0,
      totalQty: order.totalQty || 0,
      orderItemWeight: order.orderItemWeight || null,
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
      orderItemCost: null,
      positionsQty: 0,
      totalQty: 0,
      orderItemWeight: null,
      parentOrderId: parentOrder.orderId,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const orderNumber = formData.orderNumber.trim();
    if (!orderNumber) {
      setError('Номер заказа обязателен');
      return;
    }

    const data = {
      orderNumber,
      buyer: formData.buyer?.trim() || null,
      statusId: formData.statusId ? parseInt(formData.statusId) : null,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
      plannedReceiptDate: formData.plannedReceiptDate ? new Date(formData.plannedReceiptDate).toISOString() : null,
      actualReceiptDate: formData.actualReceiptDate ? new Date(formData.actualReceiptDate).toISOString() : null,
      logisticsChinaMsk: formData.logisticsChinaMsk ? parseFloat(formData.logisticsChinaMsk) : null,
      logisticsMskKzn: formData.logisticsMskKzn ? parseFloat(formData.logisticsMskKzn) : null,
      logisticsAdditional: formData.logisticsAdditional ? parseFloat(formData.logisticsAdditional) : null,
      logisticsTotal: formData.logisticsTotal ? parseFloat(formData.logisticsTotal) : null,
      orderItemCost: formData.orderItemCost ? parseFloat(formData.orderItemCost) : null,
      positionsQty: parseInt(formData.positionsQty) || 0,
      totalQty: parseInt(formData.totalQty) || 0,
      orderItemWeight: formData.orderItemWeight ? parseFloat(formData.orderItemWeight) : null,
      parentOrderId: formData.parentOrderId ? parseInt(formData.parentOrderId) : null,
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

    return (
      <>
        <tr className={`border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isChild ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
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
          <td className="px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {order.orderItemCost ? `₽${order.orderItemCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {order.totalQty || 0} шт.
              </p>
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
                    Детали
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(order)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
                {!isChild && (
                  <DropdownMenuItem onClick={() => handleCreateSubOrder(order)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Создать подзаказ
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { setCurrentOrder(order); setDeleteDialogOpen(true); }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
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
        title="Заказы поставщикам" 
        description="Управление заказами поставщикам"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Новый заказ
        </Button>
      </PageHeader>

      <div className="overflow-hidden bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-slate-500">
            Загрузка...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800">
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Номер заказа</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Покупатель</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Статус</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Дата заказа</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">План. получение</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Сумма</th>
                <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300"></th>
              </tr>
            </thead>
            <tbody>
              {parentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Заказы не найдены
                  </td>
                </tr>
              ) : (
                parentOrders.map(order => (
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
              {currentOrder ? 'Редактировать заказ' : 'Новый заказ поставщику'}
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
                <Label htmlFor="orderNumber">Номер заказа *</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">Статус</Label>
                <Select
                  value={formData.statusId ? formData.statusId.toString() : ''}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      statusId: value && value !== '' ? parseInt(value) : null 
                    });
                  }}
                >
                  <SelectTrigger id="statusId">
                    <SelectValue placeholder="Выберите статус">
                      {formData.statusId ? getOrderStatusName(formData.statusId) : ''}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не указан</SelectItem>
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
              <Label htmlFor="buyer">Покупатель</Label>
              <Input
                id="buyer"
                value={formData.buyer || ''}
                onChange={(e) => setFormData({ ...formData, buyer: e.target.value || null })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Дата заказа</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate || ''}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedReceiptDate">План. получение</Label>
                <Input
                  id="plannedReceiptDate"
                  type="date"
                  value={formData.plannedReceiptDate || ''}
                  onChange={(e) => setFormData({ ...formData, plannedReceiptDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualReceiptDate">Факт. получение</Label>
                <Input
                  id="actualReceiptDate"
                  type="date"
                  value={formData.actualReceiptDate || ''}
                  onChange={(e) => setFormData({ ...formData, actualReceiptDate: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="positionsQty">Количество позиций</Label>
                <Input
                  id="positionsQty"
                  type="number"
                  min="0"
                  value={formData.positionsQty}
                  onChange={(e) => setFormData({ ...formData, positionsQty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalQty">Общее количество</Label>
                <Input
                  id="totalQty"
                  type="number"
                  min="0"
                  value={formData.totalQty}
                  onChange={(e) => setFormData({ ...formData, totalQty: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderItemCost">Стоимость товара (₽)</Label>
                <Input
                  id="orderItemCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.orderItemCost || ''}
                  onChange={(e) => setFormData({ ...formData, orderItemCost: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logisticsTotal">Общая логистика (₽)</Label>
                <Input
                  id="logisticsTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.logisticsTotal || ''}
                  onChange={(e) => setFormData({ ...formData, logisticsTotal: e.target.value || null })}
                />
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
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {currentOrder ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить заказ "{currentOrder?.orderNumber}"? Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Отмена
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
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}