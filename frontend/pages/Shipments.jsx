import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  MoreHorizontal, 
  Eye,
  Store,
  Warehouse
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
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyShipment = {
  shipmentNumber: '',
  storeId: null,
  warehouseId: null,
  statusId: null,
  shipmentDate: null,
  acceptanceDate: null,
  logisticsCost: null,
  unitLogistics: null,
  acceptanceCost: null,
  positionsQty: 0,
  sentQty: 0,
  acceptedQty: 0,
};

export default function Shipments() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentShipment, setCurrentShipment] = useState(null);
  const [formData, setFormData] = useState(emptyShipment);
  const [error, setError] = useState('');

  const { data: shipmentsData, isLoading, refetch } = useQuery({
    queryKey: ['mpShipments'],
    queryFn: async () => {
      const response = await api.mpShipments.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const response = await api.stores.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: shipmentStatusesData } = useQuery({
    queryKey: ['shipmentStatuses'],
    queryFn: async () => {
      const response = await api.shipmentStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const shipments = Array.isArray(shipmentsData) ? shipmentsData : [];
  const stores = Array.isArray(storesData) ? storesData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const shipmentStatuses = Array.isArray(shipmentStatusesData) ? shipmentStatusesData : [];

  // Enrich shipments with names
  const enrichedShipments = useMemo(() => {
    const storeMap = new Map(stores.map(s => [s.storeId, s.name]));
    const warehouseMap = new Map(warehouses.map(w => [w.warehouseId, w.name]));
    const statusMap = new Map(shipmentStatuses.map(s => [s.shipmentStatusId, s.name]));

    return shipments.map(shipment => ({
      ...shipment,
      storeName: shipment.storeId ? storeMap.get(shipment.storeId) || 'Не указан' : null,
      warehouseName: shipment.warehouseId ? warehouseMap.get(shipment.warehouseId) || 'Не указан' : null,
      statusName: shipment.statusId ? statusMap.get(shipment.statusId) || 'Не указан' : null,
    }));
  }, [shipments, stores, warehouses, shipmentStatuses]);

  const createMutation = useMutation({
    mutationFn: (data) => api.mpShipments.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mpShipments'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка создания отгрузки');
      } else {
        setError('Ошибка создания отгрузки');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.mpShipments.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mpShipments'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка обновления отгрузки');
      } else {
        setError('Ошибка обновления отгрузки');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.mpShipments.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['mpShipments'] });
      const previousData = queryClient.getQueryData(['mpShipments']);

      queryClient.setQueryData(['mpShipments'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((shipment) => shipment.shipmentId !== deletedId);
      });

      return { previousData };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setCurrentShipment(null);
      setError('');
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['mpShipments'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка удаления отгрузки');
      } else {
        setError('Ошибка удаления отгрузки');
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData(emptyShipment);
    setCurrentShipment(null);
    setError('');
  };

  const handleEdit = (shipment) => {
    setCurrentShipment(shipment);
    setFormData({
      shipmentNumber: shipment.shipmentNumber || '',
      storeId: shipment.storeId || null,
      warehouseId: shipment.warehouseId || null,
      statusId: shipment.statusId || null,
      shipmentDate: shipment.shipmentDate ? format(new Date(shipment.shipmentDate), 'yyyy-MM-dd') : null,
      acceptanceDate: shipment.acceptanceDate ? format(new Date(shipment.acceptanceDate), 'yyyy-MM-dd') : null,
      logisticsCost: shipment.logisticsCost?.toString() || null,
      unitLogistics: shipment.unitLogistics?.toString() || null,
      acceptanceCost: shipment.acceptanceCost?.toString() || null,
      positionsQty: shipment.positionsQty || 0,
      sentQty: shipment.sentQty || 0,
      acceptedQty: shipment.acceptedQty || 0,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const data = {
      shipmentNumber: formData.shipmentNumber,
      storeId: formData.storeId || null,
      warehouseId: formData.warehouseId || null,
      statusId: formData.statusId || null,
      shipmentDate: formData.shipmentDate ? new Date(formData.shipmentDate).toISOString() : null,
      acceptanceDate: formData.acceptanceDate ? new Date(formData.acceptanceDate).toISOString() : null,
      logisticsCost: formData.logisticsCost ? parseFloat(formData.logisticsCost) : null,
      unitLogistics: formData.unitLogistics ? parseFloat(formData.unitLogistics) : null,
      acceptanceCost: formData.acceptanceCost ? parseFloat(formData.acceptanceCost) : null,
      positionsQty: formData.positionsQty || 0,
      sentQty: formData.sentQty || 0,
      acceptedQty: formData.acceptedQty || 0,
    };

    if (currentShipment) {
      updateMutation.mutate({ id: currentShipment.shipmentId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSelectedStatusName = () => {
    if (!formData.statusId) return '';
    const status = shipmentStatuses.find(s => s.shipmentStatusId === formData.statusId);
    return status?.name || '';
  };

  const columns = [
    {
      accessorKey: 'shipmentNumber',
      header: t('shipments.table.shipmentNumber'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/20">
            <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.shipmentNumber}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'storeName',
      header: t('shipments.table.store'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.storeName || t('common.notSpecified')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: t('shipments.table.warehouse'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouseName || t('common.notSpecified')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'statusName',
      header: t('shipments.table.status'),
      cell: ({ row }) => <StatusBadge status={row.original.statusName || t('common.notSpecified')} />,
    },
    {
      accessorKey: 'shipmentDate',
      header: t('shipments.table.shipmentDate'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.shipmentDate ? format(new Date(row.original.shipmentDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'sentQty',
      header: t('shipments.table.sentAccepted'),
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.sentQty || 0}
          </span>
          <span className="text-slate-400"> / </span>
          <span className={`font-medium ${
            row.original.acceptedQty >= row.original.sentQty
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {row.original.acceptedQty || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'logisticsCost',
      header: t('shipments.table.logistics'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.logisticsCost ? `${row.original.logisticsCost.toFixed(2)} ₽` : '0.00 ₽'}
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
            <DropdownMenuItem asChild>
              <Link to={`${createPageUrl('ShipmentDetails')}?id=${row.original.shipmentId}`}>
                <Eye className="w-4 h-4 mr-2" />
                {t('common.details')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { setCurrentShipment(row.original); setDeleteDialogOpen(true); }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('shipments.title')} 
        description={t('shipments.description')}
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('shipments.addShipment')}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={enrichedShipments}
        isLoading={isLoading}
        searchPlaceholder={t('shipments.searchPlaceholder')}
        emptyMessage={t('shipments.emptyMessage')}
      />

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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentShipment ? t('shipments.editShipment') : t('shipments.addShipment')}
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
                <Label htmlFor="shipmentNumber">{t('shipments.form.shipmentNumber')} *</Label>
                <Input
                  id="shipmentNumber"
                  value={formData.shipmentNumber}
                  onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">{t('shipments.form.status')}</Label>
                <Select
                  value={formData.statusId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, statusId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('shipments.form.status')}>{getSelectedStatusName()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {shipmentStatuses.map(status => (
                      <SelectItem key={status.shipmentStatusId} value={status.shipmentStatusId.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeId">{t('shipments.form.store')}</Label>
                <Select
                  value={formData.storeId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('shipments.form.store')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.storeId} value={store.storeId.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseId">{t('shipments.form.warehouse')}</Label>
                <Select
                  value={formData.warehouseId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, warehouseId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('shipments.form.warehouse')} />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipmentDate">{t('shipments.form.shipmentDate')}</Label>
                <Input
                  id="shipmentDate"
                  type="date"
                  value={formData.shipmentDate || ''}
                  onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptanceDate">Дата приёмки</Label>
                <Input
                  id="acceptanceDate"
                  type="date"
                  value={formData.acceptanceDate || ''}
                  onChange={(e) => setFormData({ ...formData, acceptanceDate: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logisticsCost">Стоимость логистики (₽)</Label>
                <Input
                  id="logisticsCost"
                  type="number"
                  step="0.01"
                  value={formData.logisticsCost || ''}
                  onChange={(e) => setFormData({ ...formData, logisticsCost: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitLogistics">Единичная логистика (₽)</Label>
                <Input
                  id="unitLogistics"
                  type="number"
                  step="0.01"
                  value={formData.unitLogistics || ''}
                  onChange={(e) => setFormData({ ...formData, unitLogistics: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptanceCost">Стоимость приёмки (₽)</Label>
                <Input
                  id="acceptanceCost"
                  type="number"
                  step="0.01"
                  value={formData.acceptanceCost || ''}
                  onChange={(e) => setFormData({ ...formData, acceptanceCost: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="positionsQty">Количество позиций</Label>
                <Input
                  id="positionsQty"
                  type="number"
                  value={formData.positionsQty || 0}
                  onChange={(e) => setFormData({ ...formData, positionsQty: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sentQty">Отправлено</Label>
                <Input
                  id="sentQty"
                  type="number"
                  value={formData.sentQty || 0}
                  onChange={(e) => setFormData({ ...formData, sentQty: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptedQty">Принято</Label>
                <Input
                  id="acceptedQty"
                  type="number"
                  value={formData.acceptedQty || 0}
                  onChange={(e) => setFormData({ ...formData, acceptedQty: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentShipment ? (updateMutation.isPending ? t('common.loading') : t('common.save')) : (createMutation.isPending ? t('common.loading') : t('common.create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shipments.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shipments.deleteConfirm.description', { shipmentNumber: currentShipment?.shipmentNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCurrentShipment(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentShipment) {
                  deleteMutation.mutate(currentShipment.shipmentId);
                }
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
