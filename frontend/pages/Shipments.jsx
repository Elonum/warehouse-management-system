import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import ShipmentsTable from '@/features/mpShipments/components/ShipmentsTable';
import { useModalState } from '@/hooks/useModalState';

const emptyShipment = {
  shipmentNumber: '',
  storeId: null,
  warehouseId: null,
  statusId: null,
  shipmentDate: null,
  acceptanceDate: null,
  logisticsCost: '',
  acceptanceCost: '',
};

export default function Shipments() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const createEditModal = useModalState(null);
  const deleteModal = useModalState(null);
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

  const { data: shipmentStatusesData, isLoading: shipmentStatusesLoading } = useQuery({
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

  const isFinalShipment = useMemo(() => {
    if (!currentShipment?.statusId) return false;
    const status = shipmentStatuses.find(
      (s) => String(s.shipmentStatusId) === String(currentShipment.statusId),
    );
    return !!status?.isFinal;
  }, [currentShipment?.statusId, shipmentStatuses]);

  // Safety: while we don't yet know status flags, prevent editing if modal is opened for an existing shipment.
  const shouldLockEdit = !!currentShipment && (shipmentStatusesLoading || isFinalShipment);

  const enrichedShipments = useMemo(() => {
    const storeMap = new Map(stores.map(s => [s.storeId, s.name]));
    const warehouseMap = new Map(warehouses.map(w => [w.warehouseId, w.name]));
    const statusMap = new Map(shipmentStatuses.map(s => [s.shipmentStatusId, s.name]));

    return shipments.map((shipment) => ({
      ...shipment,
      storeName: shipment.storeId ? storeMap.get(shipment.storeId) || t('common.notSpecified') : null,
      warehouseName: shipment.warehouseId ? warehouseMap.get(shipment.warehouseId) || t('common.notSpecified') : null,
      statusName: shipment.statusId ? statusMap.get(shipment.statusId) || t('common.notSpecified') : null,
    }));
  }, [shipments, stores, warehouses, shipmentStatuses]);

  const sanitizeMoneyInput = useCallback((value) => {
    if (value == null) return '';
    let v = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
    if (v === '') return '';

    const parts = v.split('.');
    if (parts.length > 2) {
      v = parts[0] + '.' + parts.slice(1).join('');
    }

    const endsWithDot = v.endsWith('.');
    let [intPart, fracPart] = v.split('.');

    // Ограничиваем целую часть под DECIMAL(10,2): максимум 8 цифр
    intPart = intPart ? intPart.slice(0, 8) : '';

    if (fracPart != null) {
      fracPart = fracPart.slice(0, 2);
    }

    if (endsWithDot && (fracPart == null || fracPart === '')) {
      return intPart === '' ? '0.' : `${intPart}.`;
    }

    if (fracPart != null && fracPart !== '') {
      return `${intPart}.${fracPart}`;
    }

    return intPart;
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => api.mpShipments.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mpShipments'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('shipments.errors.createFailed');
        if (err.code === 'SHIPMENT_COMPLETED') {
          message = t('shipments.errors.cannotEditCompleted');
        }
        if (err.code === 'INVALID_REQUEST') {
          if (err.message?.includes('shipmentNumber is required')) {
            message = t('shipments.errors.numberRequired');
          }
          if (err.message?.includes('statusId is required')) {
            message = t('shipments.errors.statusRequired');
          }
          if (err.message?.includes('acceptanceDate must be on or after shipmentDate')) {
            message = t('shipments.errors.invalidDateRange');
          }
        } else if (err.code === 'SHIPMENT_EXISTS') {
          message = t('shipments.errors.numberExists');
        } else if (err.code === 'SHIPMENT_STATUS_NOT_FOUND') {
          message = t('shipments.errors.statusNotFound');
        } else if (
          err.message?.includes('numeric field overflow') ||
          err.message?.includes('переполнение поля numeric')
        ) {
          message = t('shipments.errors.amountTooLarge');
        }
        setError(message);
      } else {
        setError(t('shipments.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.mpShipments.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mpShipments'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('shipments.errors.updateFailed');
        if (err.code === 'SHIPMENT_COMPLETED') {
          message = t('shipments.errors.cannotEditCompleted');
        }
        if (err.code === 'INVALID_REQUEST') {
          if (err.message?.includes('shipmentNumber is required')) {
            message = t('shipments.errors.numberRequired');
          }
          if (err.message?.includes('statusId is required')) {
            message = t('shipments.errors.statusRequired');
          }
          if (err.message?.includes('acceptanceDate must be on or after shipmentDate')) {
            message = t('shipments.errors.invalidDateRange');
          }
        } else if (err.code === 'SHIPMENT_EXISTS') {
          message = t('shipments.errors.numberExists');
        } else if (err.code === 'SHIPMENT_STATUS_NOT_FOUND') {
          message = t('shipments.errors.statusNotFound');
        } else if (err.code === 'SHIPMENT_NOT_FOUND') {
          message = t('shipments.errors.notFound');
        } else if (
          err.message?.includes('numeric field overflow') ||
          err.message?.includes('переполнение поля numeric')
        ) {
          message = t('shipments.errors.amountTooLarge');
        }
        setError(message);
      } else {
        setError(t('shipments.errors.updateFailed'));
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
      deleteModal.close();
      setCurrentShipment(null);
      setError('');
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['mpShipments'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || t('shipments.errors.deleteFailed'));
      } else {
        setError(t('shipments.errors.deleteFailed'));
      }
      deleteModal.close();
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
      acceptanceCost: shipment.acceptanceCost?.toString() || null,
    });
    setError('');
    createEditModal.open(shipment);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isFinalShipment) {
      setError(t('shipments.errors.cannotEditCompleted'));
      return;
    }

    const trimmedNumber = (formData.shipmentNumber || '').trim();
    if (!trimmedNumber) {
      setError(t('shipments.errors.numberRequired'));
      return;
    }

    if (!formData.statusId) {
      setError(t('shipments.errors.statusRequired'));
      return;
    }

    let shipmentDateIso = null;
    let acceptanceDateIso = null;

    if (formData.shipmentDate) {
      const d = new Date(formData.shipmentDate);
      if (!Number.isNaN(d.getTime())) {
        shipmentDateIso = d.toISOString();
      }
    }

    if (formData.acceptanceDate) {
      const d = new Date(formData.acceptanceDate);
      if (!Number.isNaN(d.getTime())) {
        acceptanceDateIso = d.toISOString();
      }
    }

    if (shipmentDateIso && acceptanceDateIso) {
      const shipTs = new Date(shipmentDateIso).getTime();
      const accTs = new Date(acceptanceDateIso).getTime();
      if (accTs < shipTs) {
        setError(t('shipments.errors.invalidDateRange'));
        return;
      }
    }

    const logistics = formData.logisticsCost
      ? parseFloat(formData.logisticsCost)
      : null;
    const acceptance = formData.acceptanceCost
      ? parseFloat(formData.acceptanceCost)
      : null;

    if (
      (logistics != null && logistics < 0) ||
      (acceptance != null && acceptance < 0)
    ) {
      setError(t('shipments.errors.negativeCost'));
      return;
    }

    const maxAmount = 99999999.99; // под DECIMAL(10,2)
    if (
      (logistics != null && (!Number.isFinite(logistics) || logistics > maxAmount)) ||
      (acceptance != null && (!Number.isFinite(acceptance) || acceptance > maxAmount))
    ) {
      setError(t('shipments.errors.amountTooLarge'));
      return;
    }

    const data = {
      shipmentNumber: trimmedNumber,
      storeId: formData.storeId || null,
      warehouseId: formData.warehouseId || null,
      statusId: formData.statusId || null,
      shipmentDate: shipmentDateIso,
      acceptanceDate: acceptanceDateIso,
      logisticsCost: logistics,
      acceptanceCost: acceptance,
    };

    if (currentShipment) {
      updateMutation.mutate({ id: currentShipment.shipmentId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSelectedStatusName = () => {
    if (!formData.statusId) return '';
    const status = shipmentStatuses.find(
      (s) => String(s.shipmentStatusId) === String(formData.statusId),
    );
    return status?.name || '';
  };

  const getSelectedStoreName = () => {
    if (!formData.storeId) return '';
    const store = stores.find(
      (s) => String(s.storeId) === String(formData.storeId),
    );
    return store?.name || '';
  };

  const getSelectedWarehouseName = () => {
    if (!formData.warehouseId) return '';
    const warehouse = warehouses.find(
      (w) => String(w.warehouseId) === String(formData.warehouseId),
    );
    return warehouse?.name || '';
  };

  return (
    <div className="space-y-6">
      <ShipmentsTable
        t={t}
        shipments={enrichedShipments}
        isLoading={isLoading}
        shipmentStatuses={shipmentStatuses}
        onCreateShipment={() => {
          resetForm();
          createEditModal.open();
        }}
        onEditShipment={handleEdit}
        onRequestDelete={(shipment) => {
          setCurrentShipment(shipment);
          deleteModal.open(shipment);
        }}
      />

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createEditModal.isOpen} 
        onOpenChange={(open) => {
          createEditModal.setIsOpen(open);
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
                  disabled={shouldLockEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">{t('shipments.form.status')}</Label>
                <Select
                  value={formData.statusId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, statusId: value || null })}
                >
                  <SelectTrigger disabled={shouldLockEdit}>
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
                  <SelectTrigger disabled={shouldLockEdit}>
                    <SelectValue placeholder={t('shipments.form.store')}>
                      {getSelectedStoreName()}
                    </SelectValue>
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
                  <SelectTrigger disabled={shouldLockEdit}>
                    <SelectValue placeholder={t('shipments.form.warehouse')}>
                      {getSelectedWarehouseName()}
                    </SelectValue>
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
                  className="pl-3 pr-3"
                  value={formData.shipmentDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shipmentDate: e.target.value || null,
                    })
                  }
                  disabled={shouldLockEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptanceDate">{t('shipments.form.acceptanceDate')}</Label>
                <Input
                  id="acceptanceDate"
                  type="date"
                  className="pl-3 pr-3"
                  value={formData.acceptanceDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acceptanceDate: e.target.value || null,
                    })
                  }
                  disabled={shouldLockEdit}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logisticsCost">{t('shipments.form.logisticsCost')}</Label>
                <Input
                  id="logisticsCost"
                  type="text"
                  inputMode="decimal"
                  value={formData.logisticsCost}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    setFormData({ ...formData, logisticsCost: value });
                  }}
                  disabled={shouldLockEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptanceCost">{t('shipments.form.acceptanceCost')}</Label>
                <Input
                  id="acceptanceCost"
                  type="text"
                  inputMode="decimal"
                  value={formData.acceptanceCost}
                  onChange={(e) => {
                    const value = sanitizeMoneyInput(e.target.value);
                    setFormData({ ...formData, acceptanceCost: value });
                  }}
                  disabled={shouldLockEdit}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  createEditModal.close();
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  shouldLockEdit
                }
              >
                {currentShipment ? (updateMutation.isPending ? t('common.loading') : t('common.save')) : (createMutation.isPending ? t('common.loading') : t('common.create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteModal.isOpen} onOpenChange={deleteModal.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shipments.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shipments.deleteConfirm.description', { shipmentNumber: currentShipment?.shipmentNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                deleteModal.close();
                setCurrentShipment(null);
              }}
            >
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
