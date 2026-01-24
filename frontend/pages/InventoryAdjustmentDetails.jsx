import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  MoreHorizontal,
  Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyItem = {
  productId: null,
  warehouseId: null,
  receiptQty: 0,
  writeOffQty: 0,
  reason: null, // Примечания сохраняются в поле reason
};

export default function InventoryAdjustmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const adjustmentIdParam = urlParams.get('id');
  const adjustmentId = adjustmentIdParam || null;
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [error, setError] = useState('');

  const { data: adjustment, error: adjustmentError, isLoading: loadingAdjustment } = useQuery({
    queryKey: ['inventory', adjustmentId],
    queryFn: () => api.inventories.get(adjustmentId),
    enabled: !!adjustmentId,
  });

  const { data: adjustmentItemsData = [], isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['inventoryItems', adjustmentId],
    queryFn: () => api.inventories.getItems(adjustmentId),
    enabled: !!adjustmentId,
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list({ limit: 1000, offset: 0 }),
  });

  const { data: warehousesData = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.warehouses.list({ limit: 1000, offset: 0 }),
  });

  const { data: inventoryStatusesData = [] } = useQuery({
    queryKey: ['inventoryStatuses'],
    queryFn: () => api.inventoryStatuses.list({ limit: 100, offset: 0 }),
  });

  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const inventoryStatuses = Array.isArray(inventoryStatusesData) ? inventoryStatusesData : [];
  const adjustmentItems = Array.isArray(adjustmentItemsData) ? adjustmentItemsData : [];

  const maps = useMemo(() => {
    return {
      productMap: new Map(products.map(p => [p.productId, p])),
      warehouseMap: new Map(warehouses.map(w => [w.warehouseId, w])),
      statusMap: new Map(inventoryStatuses.map(s => [s.inventoryStatusId, s.name])),
    };
  }, [products, warehouses, inventoryStatuses]);

  const enrichedItems = useMemo(() => {
    return adjustmentItems.map(item => ({
      ...item,
      productName: item.productId ? maps.productMap.get(item.productId)?.name || 'Неизвестный товар' : '—',
      productArticle: item.productId ? maps.productMap.get(item.productId)?.article || '' : '',
      warehouseName: maps.warehouseMap.get(item.warehouseId)?.name || 'Не указан',
    }));
  }, [adjustmentItems, maps]);

  const totals = useMemo(() => {
    return adjustmentItems.reduce((acc, item) => ({
      receipt: acc.receipt + (item.receiptQty || 0),
      writeoff: acc.writeoff + (item.writeOffQty || 0),
    }), { receipt: 0, writeoff: 0 });
  }, [adjustmentItems]);

  const createItemMutation = useMutation({
    mutationFn: (data) => api.inventoryItems.create(data),
    onSuccess: async () => {
      await refetchItems();
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка добавления позиции');
      } else {
        setError('Ошибка добавления позиции');
      }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => api.inventoryItems.update(id, data),
    onSuccess: async () => {
      await refetchItems();
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка обновления позиции');
      } else {
        setError('Ошибка обновления позиции');
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.inventoryItems.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryItems', adjustmentId] });
      const previousData = queryClient.getQueryData(['inventoryItems', adjustmentId]);

      queryClient.setQueryData(['inventoryItems', adjustmentId], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((item) => item.inventoryItemId !== deletedId);
      });

      return { previousData };
    },
    onSuccess: async () => {
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
      setError('');
      await refetchItems();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryItems', adjustmentId], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка удаления позиции');
      } else {
        setError('Ошибка удаления позиции');
      }
      setDeleteItemDialogOpen(false);
    },
  });

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setItemForm({
      productId: item.productId || null,
      warehouseId: item.warehouseId || adjustment?.warehouseId || null,
      receiptQty: item.receiptQty ?? 0,
      writeOffQty: item.writeOffQty ?? 0,
      reason: item.reason || null, // Примечания из поля reason
    });
    setError('');
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!adjustmentId) return;

    const data = {
      inventoryId: adjustmentId,
      productId: itemForm.productId || null,
      warehouseId: itemForm.warehouseId || null,
      receiptQty: itemForm.receiptQty ? parseInt(itemForm.receiptQty, 10) : 0,
      writeOffQty: itemForm.writeOffQty ? parseInt(itemForm.writeOffQty, 10) : 0,
      reason: itemForm.reason || null, // Примечания сохраняются в поле reason
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.inventoryItemId, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const getStatusName = () => {
    if (!adjustment?.statusId) return '—';
    return maps.statusMap.get(adjustment.statusId) || '—';
  };

  const itemColumns = [
    {
      accessorKey: 'productName',
      header: 'Товар',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800">
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.productName || '—'}
            </span>
            {row.original.productArticle && (
              <span className="text-xs text-slate-500 dark:text-slate-400">Арт: {row.original.productArticle}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: 'Склад',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">{row.original.warehouseName || 'Не указан'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'receiptQty',
      header: 'Поступление',
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.receiptQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
          {row.original.receiptQty > 0 ? `+${row.original.receiptQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'writeOffQty',
      header: 'Списание',
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.writeOffQty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
          {row.original.writeOffQty > 0 ? `-${row.original.writeOffQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Примечания',
      cell: ({ row }) => (
        <span className="block max-w-xs text-sm truncate text-slate-500 dark:text-slate-400">
          {row.original.reason || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditItem(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { setCurrentItem(row.original); setDeleteItemDialogOpen(true); }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!adjustmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Не передан ID инвентаризации</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к инвентаризациям
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader 
          title="Инвентаризация" 
          description={adjustment?.adjustmentDate ? format(new Date(adjustment.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : 'Дата не указана'}
        >
          <StatusBadge status={getStatusName()} />
        </PageHeader>
      </div>

      {adjustmentError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          Ошибка загрузки инвентаризации: {adjustmentError.message}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Дата инвентаризации</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {adjustment?.adjustmentDate ? format(new Date(adjustment.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Поступление</p>
            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              +{totals.receipt.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Списание</p>
            <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
              -{totals.writeoff.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Примечания</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
              {adjustment?.notes || '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Позиции инвентаризации ({enrichedItems.length})
          </h2>
          <Button onClick={() => { setCurrentItem(null); setItemForm({ ...emptyItem, warehouseId: adjustment?.warehouseId || null }); setError(''); setItemDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить позицию
          </Button>
        </div>
        <DataTable
          columns={itemColumns}
          data={enrichedItems}
          isLoading={loadingItems || loadingAdjustment}
          searchable={false}
          emptyMessage="В инвентаризации пока нет позиций"
        />
      </div>

      {/* Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) {
            setItemForm(emptyItem);
            setCurrentItem(null);
            setError('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? 'Редактировать позицию' : 'Добавить позицию'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="productId">Товар</Label>
              <Select
                value={itemForm.productId?.toString() || ''}
                onValueChange={(value) => setItemForm({ ...itemForm, productId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.productId} value={product.productId.toString()}>
                      {product.name || product.article || 'Товар'}{product.name && product.article ? ` (${product.article})` : product.article ? ` - ${product.article}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">Склад *</Label>
              <Select
                value={itemForm.warehouseId?.toString() || ''}
                onValueChange={(value) => setItemForm({ ...itemForm, warehouseId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId.toString()}>
                      {warehouse.name || 'Склад'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiptQty">Поступление</Label>
                <Input
                  id="receiptQty"
                  type="number"
                  min="0"
                  value={itemForm.receiptQty ?? 0}
                  onChange={(e) => setItemForm({ ...itemForm, receiptQty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="writeOffQty">Списание</Label>
                <Input
                  id="writeOffQty"
                  type="number"
                  min="0"
                  value={itemForm.writeOffQty ?? 0}
                  onChange={(e) => setItemForm({ ...itemForm, writeOffQty: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Примечания</Label>
              <Textarea
                id="reason"
                value={itemForm.reason || ''}
                onChange={(e) => setItemForm({ ...itemForm, reason: e.target.value || null })}
                rows={3}
                placeholder="Введите примечания к позиции инвентаризации"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setItemDialogOpen(false);
                setItemForm(emptyItem);
                setCurrentItem(null);
                setError('');
              }}>
                Отмена
              </Button>
              <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                {currentItem ? (updateItemMutation.isPending ? 'Сохранение...' : 'Сохранить') : (createItemMutation.isPending ? 'Создание...' : 'Создать')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить позицию</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить эту позицию из инвентаризации? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteItemDialogOpen(false);
              setCurrentItem(null);
            }}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentItem) {
                  deleteItemMutation.mutate(currentItem.inventoryItemId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
