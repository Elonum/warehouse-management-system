import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  CalendarDays,
  FileText,
  Users,
  MoreHorizontal,
  Warehouse,
  CheckCircle2,
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
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useI18n } from '@/lib/i18n';
import { GuardedButton, GuardedMenuItem } from '@/components/auth/PermissionControls';
import { usePermissions } from '@/hooks/usePermissions';

const emptyItem = {
  productId: null,
  warehouseId: null,
  receiptQty: '',
  writeOffQty: '',
  reason: null,
};

export default function InventoryAdjustmentDetails() {
  const { t } = useI18n();
  const { canWriteInventory } = usePermissions();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
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
  const mainWarehouses = useMemo(
    () => warehouses.filter((w) => !w?.isMarketplace),
    [warehouses],
  );
  const inventoryStatuses = Array.isArray(inventoryStatusesData) ? inventoryStatusesData : [];
  const adjustmentItems = Array.isArray(adjustmentItemsData) ? adjustmentItemsData : [];

  const { data: usersData = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list({ limit: 1000, offset: 0 }),
  });

  const users = Array.isArray(usersData) ? usersData : [];

  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.userId, u]));
  }, [users]);

  const getUserDisplayName = (user) => {
    if (!user) return t('common.notSpecified');
    const parts = [user.name, user.surname, user.patronymic].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return user.email || t('common.notSpecified');
  };


  const maps = useMemo(() => {
    return {
      productMap: new Map(products.map(p => [p.productId, p])),
      warehouseMap: new Map(warehouses.map(w => [w.warehouseId, w])),
      statusMap: new Map(inventoryStatuses.map(s => [s.inventoryStatusId, s])),
    };
  }, [products, warehouses, inventoryStatuses]);

  const enrichedItems = useMemo(() => {
    return adjustmentItems.map(item => ({
      ...item,
      productName: item.productId ? maps.productMap.get(item.productId)?.name || t('common.notSpecified') : t('common.notSpecified'),
      productArticle: item.productId ? maps.productMap.get(item.productId)?.article || '' : '',
      warehouseName: maps.warehouseMap.get(item.warehouseId)?.name || t('common.notSpecified'),
    }));
  }, [adjustmentItems, maps, t]);

  const totals = useMemo(() => {
    return adjustmentItems.reduce((acc, item) => ({
      receipt: acc.receipt + (item.receiptQty || 0),
      writeoff: acc.writeoff + (item.writeOffQty || 0),
    }), { receipt: 0, writeoff: 0 });
  }, [adjustmentItems]);

  const getSelectedProductLabel = () => {
    if (!itemForm.productId) return '';
    const product = products.find(p => p.productId === itemForm.productId);
    return product?.article || product?.name || '';
  };

  const isFinalStatus = useMemo(() => {
    if (!adjustment?.statusId) return false;
    const status = maps.statusMap.get(adjustment.statusId);
    return !!status?.isFinal;
  }, [adjustment, maps]);

  const finalStatus = useMemo(() => {
    return inventoryStatuses.find(s => s.isFinal) || null;
  }, [inventoryStatuses]);

  const createdByUser = adjustment?.createdBy ? userMap.get(adjustment.createdBy) : null;
  const updatedByUser = adjustment?.updatedBy ? userMap.get(adjustment.updatedBy) : null;

  const createdByName = getUserDisplayName(createdByUser);
  const completedByName = isFinalStatus
    ? getUserDisplayName(updatedByUser || createdByUser)
    : null;

  const getSelectedWarehouseLabel = () => {
    if (!itemForm.warehouseId) return '';
    const warehouse = mainWarehouses.find((w) => w.warehouseId === itemForm.warehouseId);
    return warehouse?.name || '';
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!adjustment || !finalStatus) return;
      await api.inventories.update(adjustment.inventoryId, {
        adjustmentDate: adjustment.adjustmentDate,
        statusId: finalStatus.inventoryStatusId,
        notes: adjustment.notes || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory', adjustmentId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.updateFailed');
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotUpdateCompleted');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.updateFailed'));
      }
    },
  });

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
        let message = err.message || t('inventoryAdjustments.errors.createFailed');
        if (err.code === 'INVALID_REQUEST') {
          if (err.message?.includes('inventoryId is required')) {
            message = t('inventoryAdjustments.details.errors.inventoryRequired');
          } else if (err.message?.includes('productId is required')) {
            message = t('inventoryAdjustments.details.errors.productRequired');
          } else if (err.message?.includes('warehouseId is required')) {
            message = t('inventoryAdjustments.details.errors.warehouseRequired');
          } else if (err.message?.includes('receiptQty must be non-negative') || err.message?.includes('writeOffQty must be non-negative')) {
            message = t('inventoryAdjustments.details.errors.quantityNonNegative');
          } else if (err.message?.includes('reason must be at most 255 characters')) {
            message = t('inventoryAdjustments.details.errors.reasonTooLong');
          }
        }
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotUpdateCompleted');
        }
        if (err.code === 'INVENTORY_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.inventoryNotFound');
        }
        if (err.code === 'PRODUCT_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.productNotFound');
        }
        if (err.code === 'WAREHOUSE_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.warehouseNotFound');
        }
        if (err.code === 'INVALID_QUANTITY') {
          message = t('inventoryAdjustments.details.errors.quantityNonNegative');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.createFailed'));
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
        let message = err.message || t('inventoryAdjustments.errors.updateFailed');
        if (err.code === 'INVALID_REQUEST') {
          if (err.message?.includes('inventoryId is required')) {
            message = t('inventoryAdjustments.details.errors.inventoryRequired');
          } else if (err.message?.includes('productId is required')) {
            message = t('inventoryAdjustments.details.errors.productRequired');
          } else if (err.message?.includes('warehouseId is required')) {
            message = t('inventoryAdjustments.details.errors.warehouseRequired');
          } else if (err.message?.includes('receiptQty must be non-negative') || err.message?.includes('writeOffQty must be non-negative')) {
            message = t('inventoryAdjustments.details.errors.quantityNonNegative');
          } else if (err.message?.includes('reason must be at most 255 characters')) {
            message = t('inventoryAdjustments.details.errors.reasonTooLong');
          }
        }
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotUpdateCompleted');
        }
        if (err.code === 'INVENTORY_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.inventoryNotFound');
        }
        if (err.code === 'PRODUCT_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.productNotFound');
        }
        if (err.code === 'WAREHOUSE_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.warehouseNotFound');
        }
        if (err.code === 'INVALID_QUANTITY') {
          message = t('inventoryAdjustments.details.errors.quantityNonNegative');
        }
        if (err.code === 'ITEM_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.itemNotFound');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.updateFailed'));
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
        let message = err.message || t('inventoryAdjustments.errors.deleteFailed');
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotUpdateCompleted');
        }
        if (err.code === 'ITEM_NOT_FOUND') {
          message = t('inventoryAdjustments.details.errors.itemNotFound');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.deleteFailed'));
      }
      setDeleteItemDialogOpen(false);
    },
  });

  const handleEditItem = (item) => {
    if (isFinalStatus) return;
    setCurrentItem(item);
    setItemForm({
      productId: item.productId || null,
      warehouseId: item.warehouseId || adjustment?.warehouseId || null,
      receiptQty: item.receiptQty != null ? String(item.receiptQty) : '',
      writeOffQty: item.writeOffQty != null ? String(item.writeOffQty) : '',
      reason: item.reason || null,
    });
    setError('');
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!adjustmentId) return;

    if (!itemForm.productId) {
      setError(t('inventoryAdjustments.details.errors.productRequired'));
      return;
    }
    if (!itemForm.warehouseId) {
      setError(t('inventoryAdjustments.details.errors.warehouseRequired'));
      return;
    }

    const normalizeQty = (val) => {
      if (!val) return 0;
      const raw = String(val).replace(/[^\d]/g, '');
      if (!raw) return 0;
      const num = parseInt(raw, 10);
      if (!Number.isFinite(num) || num < 0) return 0;
      return Math.min(num, 1000000000);
    };

    const data = {
      inventoryId: adjustmentId,
      productId: itemForm.productId || null,
      warehouseId: itemForm.warehouseId || null,
      receiptQty: normalizeQty(itemForm.receiptQty),
      writeOffQty: normalizeQty(itemForm.writeOffQty),
      reason: itemForm.reason || null,
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.inventoryItemId, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const getStatusName = () => {
    if (!adjustment?.statusId) return t('common.notSpecified');
    const status = maps.statusMap.get(adjustment.statusId);
    return status?.name || t('common.notSpecified');
  };

  const itemColumns = useMemo(() => {
    const baseColumns = [
    {
      accessorKey: 'productName',
      header: t('inventoryAdjustments.details.productLabel'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800">
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex flex-col">
            {row.original.productId ? (
              <Link
                to={`/products/details?id=${row.original.productId}`}
                className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {row.original.productArticle || row.original.productName || t('common.notSpecified')}
              </Link>
            ) : (
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {t('common.notSpecified')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: t('inventoryAdjustments.details.warehouseLabel'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <Link
            to={`/warehouses/details?id=${row.original.warehouseId}`}
            className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {row.original.warehouseName || t('common.notSpecified')}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'receiptQty',
      header: t('inventoryAdjustments.details.receiptLabel'),
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.receiptQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
          {row.original.receiptQty > 0 ? `+${row.original.receiptQty.toLocaleString()}` : t('common.notSpecified')}
        </span>
      ),
    },
    {
      accessorKey: 'writeOffQty',
      header: t('inventoryAdjustments.details.writeOffLabel'),
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.writeOffQty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
          {row.original.writeOffQty > 0 ? `-${row.original.writeOffQty.toLocaleString()}` : t('common.notSpecified')}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: t('inventoryAdjustments.details.reasonLabel'),
      cell: ({ row }) => (
        <span className="block max-w-xs text-sm truncate text-slate-500 dark:text-slate-400">
          {row.original.reason || t('common.notSpecified')}
        </span>
      ),
    },
    ];

    if (!isFinalStatus) {
      baseColumns.push({
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
              <GuardedMenuItem allowed={canWriteInventory} onClick={() => handleEditItem(row.original)}>
                <Edit2 className="w-4 h-4 mr-2" />
                {t('inventoryAdjustments.details.editItem')}
              </GuardedMenuItem>
              <DropdownMenuSeparator />
              <GuardedMenuItem
                allowed={canWriteInventory}
                onClick={() => {
                  setCurrentItem(row.original);
                  setDeleteItemDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('inventoryAdjustments.details.deleteItemTitle')}
              </GuardedMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }

    return baseColumns;
  }, [isFinalStatus, t, canWriteInventory]);

  if (!adjustmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t('inventoryAdjustments.details.noId')}</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('inventoryAdjustments.details.backToList')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start lg:items-center">
        <Button variant="ghost" size="icon" className="self-start shrink-0" asChild>
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader
          className="mb-0 min-w-0 flex-1"
          title={t('inventoryAdjustments.details.title')} 
          description={adjustment?.adjustmentDate ? format(new Date(adjustment.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : t('inventoryAdjustments.details.noDate')}
        >
          <div className="flex items-center gap-3">
            <StatusBadge
              status={getStatusName()}
              className={isFinalStatus ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : ''}
            />
            {!isFinalStatus && finalStatus && (
              <GuardedButton
                allowed={canWriteInventory}
                type="button"
                size="sm"
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {completeMutation.isPending
                  ? t('inventoryAdjustments.details.completing')
                  : t('inventoryAdjustments.details.completeButton')}
              </GuardedButton>
            )}
          </div>
        </PageHeader>
      </div>

      {adjustmentError && (
        <div className="p-3 text-sm text-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400">
          {t('inventoryAdjustments.details.loadError')}: {adjustmentError.message}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-4 md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{t('inventoryAdjustments.details.summaryDate')}</p>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {adjustment?.adjustmentDate ? format(new Date(adjustment.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : t('common.notSpecified')}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1 dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{t('inventoryAdjustments.details.summaryReceipt')}</p>
            </div>
            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              +{totals.receipt.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1 dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{t('inventoryAdjustments.details.summaryWriteOff')}</p>
            </div>
            <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
              -{totals.writeoff.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-4 md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{t('inventoryAdjustments.details.summaryNotes')}</p>
            </div>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
              {adjustment?.notes || t('common.notSpecified')}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-4 md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{t('inventoryAdjustments.details.summaryUsers')}</p>
            </div>
            <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <p>
                {t('inventoryAdjustments.details.createdBy')}{' '}
                <span
                  title={t('inventoryAdjustments.meta.createdByAt', {
                    user: createdByName,
                    datetime: adjustment?.createdAt
                      ? format(new Date(adjustment.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })
                      : t('inventoryAdjustments.details.noDate'),
                  })}
                >
                  {createdByName}
                  {adjustment?.createdAt
                    ? ` • ${format(new Date(adjustment.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}`
                    : ''}
                </span>
              </p>
              {isFinalStatus && completedByName && adjustment?.updatedAt && (
                <p className="text-emerald-600 dark:text-emerald-400">
                  {t('inventoryAdjustments.details.completedBy')}{' '}
                  <span
                    title={t('inventoryAdjustments.meta.completedByAt', {
                      user: completedByName,
                      datetime: format(new Date(adjustment.updatedAt), 'dd.MM.yyyy HH:mm', { locale: ru }),
                    })}
                  >
                    {completedByName} •{' '}
                    {format(new Date(adjustment.updatedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('inventoryAdjustments.details.itemsTitle')} ({enrichedItems.length})
          </h2>
          {!isFinalStatus && (
            <GuardedButton
              allowed={canWriteInventory}
              onClick={() => {
                setCurrentItem(null);
                setItemForm({ ...emptyItem, warehouseId: adjustment?.warehouseId || null });
                setError('');
                setItemDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('inventoryAdjustments.details.addItem')}
            </GuardedButton>
          )}
        </div>
        <DataTable
          columns={itemColumns}
          data={enrichedItems}
          isLoading={loadingItems || loadingAdjustment}
          searchable={false}
          emptyMessage={t('inventoryAdjustments.details.emptyItems')}
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
              {currentItem ? t('inventoryAdjustments.details.editItem') : t('inventoryAdjustments.details.addItem')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="productId">{t('inventoryAdjustments.details.productLabel')} *</Label>
              <Select
                value={itemForm.productId?.toString() || ''}
                onValueChange={(value) => setItemForm({ ...itemForm, productId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventoryAdjustments.details.productLabel')}>
                    {getSelectedProductLabel()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.productId} value={product.productId.toString()}>
                      {product.article || product.name || t('common.notSpecified')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{t('inventoryAdjustments.details.warehouseLabel')} *</Label>
              <Select
                value={itemForm.warehouseId?.toString() || ''}
                onValueChange={(value) => setItemForm({ ...itemForm, warehouseId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventoryAdjustments.details.warehouseLabel')}>
                    {getSelectedWarehouseLabel()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mainWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId.toString()}>
                      {warehouse.name || t('common.notSpecified')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="receiptQty">{t('inventoryAdjustments.details.receiptLabel')}</Label>
                <Input
                  id="receiptQty"
                  type="number"
                  min="0"
                max="1000000000"
                value={itemForm.receiptQty ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  setItemForm({ ...itemForm, receiptQty: raw });
                }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="writeOffQty">{t('inventoryAdjustments.details.writeOffLabel')}</Label>
                <Input
                  id="writeOffQty"
                  type="number"
                  min="0"
                max="1000000000"
                value={itemForm.writeOffQty ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  setItemForm({ ...itemForm, writeOffQty: raw });
                }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('inventoryAdjustments.details.reasonLabel')}</Label>
              <Textarea
                id="reason"
                value={itemForm.reason || ''}
                onChange={(e) => setItemForm({ ...itemForm, reason: e.target.value || null })}
                rows={3}
              maxLength={255}
                placeholder={t('inventoryAdjustments.details.reasonPlaceholder')}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setItemDialogOpen(false);
                  setItemForm(emptyItem);
                  setCurrentItem(null);
                  setError('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                {currentItem
                  ? (updateItemMutation.isPending ? t('common.loading') : t('common.save'))
                  : (createItemMutation.isPending ? t('common.loading') : t('common.create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventoryAdjustments.details.deleteItemTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventoryAdjustments.details.deleteItemDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteItemDialogOpen(false);
              setCurrentItem(null);
              }}>
                {t('common.cancel')}
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
                {deleteItemMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}