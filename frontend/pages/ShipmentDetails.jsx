import React, { useMemo, useState, useCallback } from 'react';
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
  Truck,
  CalendarDays,
  CircleDollarSign,
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
import { useI18n } from '@/lib/i18n';
import { GuardedButton, GuardedMenuItem } from '@/components/auth/PermissionControls';
import { usePermissions } from '@/hooks/usePermissions';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DECIMAL_10_2_MAX,
  parseDecimalOrNull,
  sanitizeDecimal10_2Input,
  isDecimal10_2InRange,
} from '@/features/mpShipments/utils/decimal';
import { FINAL_STATUS_BADGE_CLASS } from '@/features/mpShipments/utils/badge';
import { mapShipmentItemApiError } from '@/features/mpShipments/utils/errors';

const emptyItem = {
  productId: null,
  sentQty: '',
  acceptedQty: '',
  logisticsForItem: null,
};

export default function ShipmentDetails() {
  const { t } = useI18n();
  const { canWriteMarketplace } = usePermissions();
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentIdParam = urlParams.get('id');
  const shipmentId = shipmentIdParam || null;
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [error, setError] = useState('');
  const [completionError, setCompletionError] = useState('');

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
      storeMap: new Map(stores.map(s => [s.storeId, s])),
      warehouseMap: new Map(warehouses.map(w => [w.warehouseId, w])),
      statusMap: new Map(shipmentStatuses.map(s => [s.shipmentStatusId, s.name])),
    };
  }, [products, warehouses, stores, shipmentStatuses]);

  const finalShipmentStatus = useMemo(() => {
    return shipmentStatuses.find((s) => s.isFinal) || null;
  }, [shipmentStatuses]);

  const isFinalStatus = useMemo(() => {
    if (!shipment?.statusId) return false;
    const status = shipmentStatuses.find(
      (s) => s.shipmentStatusId === shipment.statusId,
    );
    return !!status?.isFinal;
  }, [shipment?.statusId, shipmentStatuses]);

  const enrichedItems = useMemo(() => {
    return shipmentItems.map((item) => {
      const product = maps.productMap.get(item.productId);
      const productName =
        product?.article ||
        product?.name ||
        item.productName ||
        t('shipmentDetails.unknownProduct');
      const productBarcode = product?.barcode || item.productBarcode || null;

      return {
        ...item,
        productName,
        productBarcode,
      };
    });
  }, [shipmentItems, maps.productMap, t]);

  const getSelectedProductName = useCallback(() => {
    if (!itemForm.productId) return '';
    const product = maps.productMap.get(itemForm.productId);
    return product?.article || product?.name || t('shipmentDetails.unknownProduct');
  }, [itemForm.productId, maps.productMap, t]);

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
      setError(mapShipmentItemApiError(t, err, 'shipmentDetails.errors.createFailed'));
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
      setError(mapShipmentItemApiError(t, err, 'shipmentDetails.errors.updateFailed'));
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
        setError(mapShipmentItemApiError(t, err, 'shipmentDetails.errors.deleteFailed'));
      } else {
        setError(t('shipmentDetails.errors.deleteFailed'));
      }
      setDeleteItemDialogOpen(false);
    },
  });

  const completeShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!shipment || !finalShipmentStatus) return;

      const data = {
        shipmentNumber: shipment.shipmentNumber,
        storeId: shipment.storeId || null,
        mainWarehouseId: shipment.mainWarehouseId || null,
        mpWarehouseId: shipment.mpWarehouseId || null,
        statusId: finalShipmentStatus.shipmentStatusId,
        shipmentDate: shipment.shipmentDate ?? null,
        acceptanceDate: shipment.acceptanceDate ?? null,
        logisticsCost: shipment.logisticsCost ?? null,
        acceptanceCost: shipment.acceptanceCost ?? null,
        positionsQty: shipment.positionsQty ?? 0,
        sentQty: shipment.sentQty ?? 0,
        acceptedQty: shipment.acceptedQty ?? 0,
      };

      return api.mpShipments.update(shipmentId, data);
    },
    onSuccess: async () => {
      setCompletionError('');
      setItemDialogOpen(false);
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
      setError('');

      await queryClient.invalidateQueries({ queryKey: ['mpShipment', shipmentId] });
      await queryClient.invalidateQueries({ queryKey: ['mpShipmentItems', shipmentId] });
      await queryClient.invalidateQueries({ queryKey: ['mpShipments'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'SHIPMENT_COMPLETED') {
          setCompletionError(t('shipmentDetails.errors.cannotEditCompleted'));
          return;
        }
        setCompletionError(err.message || t('shipmentDetails.errors.completeFailed'));
        return;
      }
      setCompletionError(t('shipmentDetails.errors.completeFailed'));
    },
  });

  const handleEditItem = (item) => {
    if (isFinalStatus) return;
    setCurrentItem(item);
    setItemForm({
      productId: item.productId || null,
      sentQty: item.sentQty != null ? String(item.sentQty) : '',
      acceptedQty: item.acceptedQty != null ? String(item.acceptedQty) : '',
      logisticsForItem: item.logisticsForItem != null ? String(item.logisticsForItem) : null,
    });
    setError('');
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!shipmentId) return;
    if (isFinalStatus) {
      setError(t('shipmentDetails.errors.cannotEditCompleted'));
      return;
    }

    if (!itemForm.productId) {
      setError(t('shipmentDetails.errors.productRequired'));
      return;
    }

    const sentQty = itemForm.sentQty ? parseInt(itemForm.sentQty, 10) : 0;
    const acceptedQty = itemForm.acceptedQty ? parseInt(itemForm.acceptedQty, 10) : 0;

    if (sentQty < 0 || acceptedQty < 0) {
      setError(t('shipmentDetails.errors.nonNegative'));
      return;
    }

    if (acceptedQty > sentQty) {
      setError(t('shipmentDetails.errors.invalidQuantity'));
      return;
    }

    const logisticsForItem =
      itemForm.logisticsForItem == null || itemForm.logisticsForItem === ''
        ? null
        : parseDecimalOrNull(itemForm.logisticsForItem);

    if (!isDecimal10_2InRange(logisticsForItem)) {
      setError(t('shipmentDetails.errors.nonNegative'));
      return;
    }

    if (logisticsForItem != null && logisticsForItem > DECIMAL_10_2_MAX) {
      setError(t('shipmentDetails.errors.amountTooLarge'));
      return;
    }

    const multiplier = acceptedQty || sentQty;

    const data = {
      shipmentId,
      productId: itemForm.productId || null,
      sentQty,
      acceptedQty,
      logisticsForItem,
      totalLogisticsForItem:
        logisticsForItem != null && multiplier
          ? logisticsForItem * multiplier
          : null,
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
      header: t('shipmentDetails.table.product'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800">
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.productName || t('shipmentDetails.unknownProduct')}
            </span>
            {row.original.productBarcode && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {row.original.productBarcode}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sentQty',
      header: t('shipmentDetails.table.sentQty'),
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.sentQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'acceptedQty',
      header: t('shipmentDetails.table.acceptedQty'),
      cell: ({ row }) => (
        <span
          className={`font-medium ${
            row.original.acceptedQty >= row.original.sentQty
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {row.original.acceptedQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'logistics',
      header: t('shipmentDetails.table.logistics'),
      cell: ({ row }) => {
        const unit = row.original.logisticsForItem;
        const total = row.original.totalLogisticsForItem;
        return (
          <div className="flex flex-col text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {t('shipmentDetails.table.logisticsUnitLabel')}:{' '}
              {unit != null ? `${unit.toFixed(2)} ₽` : '—'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t('shipmentDetails.table.logisticsTotalLabel')}:{' '}
              {total != null
                ? `${total.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                  })} ₽`
                : '—'}
            </span>
          </div>
        );
      },
    },
    ...(!isFinalStatus
      ? [
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
                  <GuardedMenuItem allowed={canWriteMarketplace} onClick={() => handleEditItem(row.original)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </GuardedMenuItem>
                  <DropdownMenuSeparator />
                  <GuardedMenuItem
                    allowed={canWriteMarketplace}
                    onClick={() => {
                      setCurrentItem(row.original);
                      setDeleteItemDialogOpen(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </GuardedMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]
      : []),
  ];

  if (!shipmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t('shipmentDetails.noId')}</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('shipmentDetails.backToList')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start lg:items-center">
        <Button variant="ghost" size="icon" className="self-start shrink-0" asChild>
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader
          className="mb-0 min-w-0 flex-1"
          title={shipment?.shipmentNumber || t('common.loading')}
          description={
            shipment
              ? maps.storeMap.get(shipment.storeId)?.name ||
                `${t('shipmentDetails.summary.store')} #${
                  shipment.storeId || '-'
                }`
              : ''
          }
        >
          <div className="flex items-center gap-3">
            <StatusBadge
              status={maps.statusMap.get(shipment?.statusId) || '—'}
              className={isFinalStatus ? FINAL_STATUS_BADGE_CLASS : undefined}
            />
            {shipment && !isFinalStatus && finalShipmentStatus && (
              <GuardedButton
                allowed={canWriteMarketplace}
                type="button"
                size="sm"
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={() => completeShipmentMutation.mutate()}
                disabled={completeShipmentMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {completeShipmentMutation.isPending
                  ? t('shipmentDetails.completing')
                  : t('shipmentDetails.completeButton')}
              </GuardedButton>
            )}
          </div>
        </PageHeader>
      </div>

      {shipmentError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {t('shipmentDetails.loadError')}: {shipmentError.message}
        </div>
      )}
      {completionError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {completionError}
        </div>
      )}

      {/* Shipment Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Row 1 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipmentDetails.summary.store')}
              </p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {maps.storeMap.get(shipment?.storeId)?.name ||
                shipment?.storeId ||
                '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-500">
                  {t('shipmentDetails.summary.warehouse')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-slate-500">
                  {t('shipmentDetails.summary.marketplaceWarehouse')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {maps.warehouseMap.get(shipment?.mainWarehouseId)?.name ||
                  shipment?.mainWarehouseId ||
                  '—'}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {maps.warehouseMap.get(shipment?.mpWarehouseId)?.name ||
                  shipment?.mpWarehouseId ||
                  '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipmentDetails.summary.shipmentDate')}
              </p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.shipmentDate
                ? format(new Date(shipment.shipmentDate), 'dd.MM.yyyy', {
                    locale: ru,
                  })
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipmentDetails.summary.acceptanceDate')}
              </p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.acceptanceDate
                ? format(new Date(shipment.acceptanceDate), 'dd.MM.yyyy', {
                    locale: ru,
                  })
                : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipments.summary.sent')}
              </p>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.sentQty ?? 0}{' '}
              {t('shipments.summary.units')}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipments.summary.accepted')}
              </p>
            </div>
            <p
              className={`mt-1 text-lg font-semibold ${
                (shipment?.acceptedQty ?? 0) >= (shipment?.sentQty ?? 0)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {shipment?.acceptedQty ?? 0}{' '}
              {t('shipments.summary.units')}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipmentDetails.summary.logistics')}
              </p>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.logisticsCost
                ? `${shipment.logisticsCost.toFixed(2)} ₽`
                : '0.00 ₽'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CircleDollarSign className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">
                {t('shipments.table.acceptanceCost')}
              </p>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.acceptanceCost
                ? `${shipment.acceptanceCost.toFixed(2)} ₽`
                : '0.00 ₽'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('shipmentDetails.itemsTitle')} ({enrichedItems.length})
          </h2>
          {!isFinalStatus ? (
            <GuardedButton
              allowed={canWriteMarketplace}
              onClick={() => {
                setCurrentItem(null);
                setItemForm(emptyItem);
                setItemDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('shipmentDetails.addItem')}
            </GuardedButton>
          ) : null}
        </div>
        <DataTable
          columns={itemColumns}
          data={enrichedItems}
          isLoading={loadingItems || loadingShipment}
          searchable={false}
          emptyMessage={t('shipmentDetails.emptyItems')}
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
              {currentItem
                ? t('shipmentDetails.form.titleEdit')
                : t('shipmentDetails.form.titleCreate')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="productId">
                {t('shipmentDetails.form.product')} *
              </Label>
              <Select
                value={itemForm.productId?.toString() || ''}
                onValueChange={(value) => setItemForm({ ...itemForm, productId: value || null })}
              >
                <SelectTrigger disabled={isFinalStatus}>
                  <SelectValue placeholder={t('shipmentDetails.form.productPlaceholder')}>
                    {getSelectedProductName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem
                      key={product.productId}
                      value={product.productId.toString()}
                    >
                      {product.name || product.article || t('shipmentDetails.unknownProduct')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sentQty">
                  {t('shipmentDetails.form.sentQty')} *
                </Label>
                <Input
                  id="sentQty"
                  type="number"
                  min="0"
                  value={itemForm.sentQty ?? ''}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, sentQty: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptedQty">
                  {t('shipmentDetails.form.acceptedQty')}
                </Label>
                <Input
                  id="acceptedQty"
                  type="number"
                  min="0"
                  value={itemForm.acceptedQty ?? ''}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, acceptedQty: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logisticsForItem">
                {t('shipmentDetails.form.logisticsForItem')}
              </Label>
              <Input
                id="logisticsForItem"
                type="text"
                inputMode="decimal"
                value={itemForm.logisticsForItem || ''}
                onChange={(e) => {
                  const next = sanitizeDecimal10_2Input(e.target.value);
                  setItemForm({
                    ...itemForm,
                    logisticsForItem: next === '' ? null : next,
                  });
                }}
                disabled={isFinalStatus}
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
              <Button
                type="submit"
                disabled={
                  createItemMutation.isPending || updateItemMutation.isPending
                }
              >
                {currentItem ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('shipmentDetails.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('shipmentDetails.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteItemDialogOpen(false);
                setCurrentItem(null);
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFinalStatus) return;
                if (currentItem) {
                  deleteItemMutation.mutate(currentItem.shipmentItemId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteItemMutation.isPending || isFinalStatus}
            >
              {deleteItemMutation.isPending
                ? t('shipmentDetails.deleteDialog.deleting')
                : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
