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
  Store,
  Warehouse,
  Truck
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
  sentQty: 0,
  acceptedQty: 0,
  logisticsForItem: null,
};

export default function ShipmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentIdParam = urlParams.get('id');
  const shipmentId = shipmentIdParam || null;
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [error, setError] = useState('');

  const { data: shipment, error: shipmentError, isLoading: loadingShipment } = useQuery({
    queryKey: ['mpShipment', shipmentId],
    queryFn: () => api.mpShipments.get(shipmentId),
    enabled: !!shipmentId,
  });

  const { data: shipmentItemsData = [], isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['mpShipmentItems', shipmentId],
    queryFn: () => api.mpShipments.getItems(shipmentId),
    enabled: !!shipmentId,
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list({ limit: 1000, offset: 0 }),
  });

  const { data: warehousesData = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.warehouses.list({ limit: 1000, offset: 0 }),
  });

  const { data: storesData = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.stores.list({ limit: 1000, offset: 0 }),
  });

  const { data: shipmentStatusesData = [] } = useQuery({
    queryKey: ['shipmentStatuses'],
    queryFn: () => api.shipmentStatuses.list({ limit: 100, offset: 0 }),
  });

  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const stores = Array.isArray(storesData) ? storesData : [];
  const shipmentStatuses = Array.isArray(shipmentStatusesData) ? shipmentStatusesData : [];
  const shipmentItems = Array.isArray(shipmentItemsData) ? shipmentItemsData : [];

  const maps = useMemo(() => {
    return {
      productMap: new Map(products.map(p => [p.productId, p])),
      warehouseMap: new Map(warehouses.map(w => [w.warehouseId, w])),
      storeMap: new Map(stores.map(s => [s.storeId, s])),
      statusMap: new Map(shipmentStatuses.map(s => [s.shipmentStatusId, s.name])),
    };
  }, [products, warehouses, stores, shipmentStatuses]);

  const enrichedItems = useMemo(() => {
    return shipmentItems.map(item => ({
      ...item,
      productName: maps.productMap.get(item.productId)?.name || 'Неизвестный товар',
      productArticle: maps.productMap.get(item.productId)?.article || '',
      warehouseName: maps.warehouseMap.get(item.warehouseId)?.name || 'Не указан',
    }));
  }, [shipmentItems, maps]);

  const createItemMutation = useMutation({
    mutationFn: (data) => api.mpShipmentItems.create(data),
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
    mutationFn: ({ id, data }) => api.mpShipmentItems.update(id, data),
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
    mutationFn: (id) => api.mpShipmentItems.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['mpShipmentItems', shipmentId] });
      const previousData = queryClient.getQueryData(['mpShipmentItems', shipmentId]);

      queryClient.setQueryData(['mpShipmentItems', shipmentId], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((item) => item.shipmentItemId !== deletedId);
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
        queryClient.setQueryData(['mpShipmentItems', shipmentId], context.previousData);
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
      warehouseId: item.warehouseId || shipment?.warehouseId || null,
      sentQty: item.sentQty ?? 0,
      acceptedQty: item.acceptedQty ?? 0,
      logisticsForItem: item.logisticsForItem?.toString() || null,
    });
    setError('');
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!shipmentId) return;

    const data = {
      shipmentId,
      productId: itemForm.productId || null,
      warehouseId: itemForm.warehouseId || null,
      sentQty: itemForm.sentQty ? parseInt(itemForm.sentQty, 10) : 0,
      acceptedQty: itemForm.acceptedQty ? parseInt(itemForm.acceptedQty, 10) : 0,
      logisticsForItem: itemForm.logisticsForItem ? parseFloat(itemForm.logisticsForItem) : null,
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.shipmentItemId, data });
    } else {
      createItemMutation.mutate(data);
    }
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
              {row.original.productName || 'Неизвестный товар'}
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
      accessorKey: 'sentQty',
      header: 'Отправлено',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.sentQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'acceptedQty',
      header: 'Принято',
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.acceptedQty >= row.original.sentQty
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          {row.original.acceptedQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'logisticsForItem',
      header: 'Логистика',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.logisticsForItem ? `${row.original.logisticsForItem.toFixed(2)} ₽` : '0.00 ₽'}
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

  if (!shipmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Не передан ID отгрузки</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к отгрузкам
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader 
          title={shipment?.shipmentNumber || 'Загрузка...'}
          description={shipment ? `${maps.storeMap.get(shipment.storeId)?.name || 'Магазин #' + (shipment.storeId || '-')}` : ''}
        >
          <StatusBadge status={maps.statusMap.get(shipment?.statusId) || '—'} />
        </PageHeader>
      </div>

      {shipmentError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          Ошибка загрузки отгрузки: {shipmentError.message}
        </div>
      )}

      {/* Shipment Summary */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Магазин</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {maps.storeMap.get(shipment?.storeId)?.name || shipment?.storeId || '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Склад</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {maps.warehouseMap.get(shipment?.warehouseId)?.name || shipment?.warehouseId || '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Дата отгрузки</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.shipmentDate ? format(new Date(shipment.shipmentDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Дата приёмки</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.acceptanceDate ? format(new Date(shipment.acceptanceDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Логистика</p>
            <p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {shipment?.logisticsCost ? `${shipment.logisticsCost.toFixed(2)} ₽` : '0.00 ₽'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Позиции отгрузки ({enrichedItems.length})
          </h2>
          <Button onClick={() => { setCurrentItem(null); setItemForm({ ...emptyItem, warehouseId: shipment?.warehouseId || null }); setItemDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить позицию
          </Button>
        </div>
        <DataTable
          columns={itemColumns}
          data={enrichedItems}
          isLoading={loadingItems || loadingShipment}
          searchable={false}
          emptyMessage="В отгрузке пока нет позиций"
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
              <Label htmlFor="productId">Товар *</Label>
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
                      {product.name} ({product.article})
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
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sentQty">Отправлено *</Label>
                <Input
                  id="sentQty"
                  type="number"
                  min="0"
                  value={itemForm.sentQty ?? 0}
                  onChange={(e) => setItemForm({ ...itemForm, sentQty: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptedQty">Принято</Label>
                <Input
                  id="acceptedQty"
                  type="number"
                  min="0"
                  value={itemForm.acceptedQty ?? 0}
                  onChange={(e) => setItemForm({ ...itemForm, acceptedQty: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logisticsForItem">Логистика (₽)</Label>
              <Input
                id="logisticsForItem"
                type="number"
                step="0.01"
                min="0"
                value={itemForm.logisticsForItem || ''}
                onChange={(e) => setItemForm({ ...itemForm, logisticsForItem: e.target.value || null })}
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
              Вы уверены, что хотите удалить эту позицию из отгрузки? Это действие нельзя отменить.
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
                  deleteItemMutation.mutate(currentItem.shipmentItemId);
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
