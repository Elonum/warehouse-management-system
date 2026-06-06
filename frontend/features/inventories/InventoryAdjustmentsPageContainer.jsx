import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { format } from 'date-fns';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import InventoryAdjustmentsTable from '@/features/inventories/components/InventoryAdjustmentsTable';
import { useModalState } from '@/hooks/useModalState';
import { usePermissions } from '@/hooks/usePermissions';

const emptyAdjustment = {
  adjustmentDate: null,
  statusId: null,
  notes: null,
};

function InventoryAdjustmentsPageContainer() {
  const { t } = useI18n();
  const { canWriteInventory } = usePermissions();
  const queryClient = useQueryClient();

  const createEditModal = useModalState(null);
  const deleteModal = useModalState(null);
  const [currentAdjustment, setCurrentAdjustment] = useState(null);
  const [formData, setFormData] = useState(emptyAdjustment);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteErrorDialogOpen, setDeleteErrorDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: inventoriesData, isLoading, refetch } = useQuery({
    queryKey: ['inventories'],
    queryFn: async () => {
      const response = await api.inventories.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: inventoryStatusesData } = useQuery({
    queryKey: ['inventoryStatuses'],
    queryFn: async () => {
      const response = await api.inventoryStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const inventories = Array.isArray(inventoriesData) ? inventoriesData : [];
  const inventoryStatuses = Array.isArray(inventoryStatusesData) ? inventoryStatusesData : [];

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.users.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const users = Array.isArray(usersData) ? usersData : [];

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.userId, u])),
    [users],
  );

  const getUserDisplayName = (user) => {
    if (!user) return t('common.notSpecified');
    const parts = [user.name, user.surname, user.patronymic].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return user.email || t('common.notSpecified');
  };

  const enrichedInventories = useMemo(() => {
    const statusMap = new Map(inventoryStatuses.map((s) => [s.inventoryStatusId, s]));

    return inventories.map((inventory, index) => {
      const status = statusMap.get(inventory.statusId);
      const createdByUser = inventory.createdBy ? userMap.get(inventory.createdBy) : null;
      const updatedByUser = inventory.updatedBy ? userMap.get(inventory.updatedBy) : null;
      const statusIsFinal = !!status?.isFinal;

      const createdByName = getUserDisplayName(createdByUser);

      let completedByName = null;
      let completedAt = null;
      if (statusIsFinal && inventory.updatedBy && inventory.updatedAt) {
        completedByName = getUserDisplayName(updatedByUser || createdByUser);
        completedAt = inventory.updatedAt;
      }

      return {
        ...inventory,
        statusName: status?.name || t('common.notSpecified'),
        statusIsFinal,
        rowNumber: index + 1,
        createdByName,
        completedByName,
        completedAt,
      };
    });
  }, [inventories, inventoryStatuses, userMap, t]);

  const createMutation = useMutation({
    mutationFn: (data) => api.inventories.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventories'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.createFailed');
        if (err.code === 'INVALID_REQUEST' && err.message?.includes('statusId is required')) {
          message = t('inventoryAdjustments.errors.statusRequired');
        }
        if (err.code === 'INVENTORY_STATUS_NOT_FOUND') {
          message = t('inventoryAdjustments.errors.statusNotFound');
        }
        if (err.code === 'INVENTORY_EXISTS') {
          message = t('inventoryAdjustments.errors.alreadyExists');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.inventories.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventories'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.updateFailed');
        if (err.code === 'INVALID_REQUEST' && err.message?.includes('statusId is required')) {
          message = t('inventoryAdjustments.errors.statusRequired');
        }
        if (err.code === 'INVENTORY_STATUS_NOT_FOUND') {
          message = t('inventoryAdjustments.errors.statusNotFound');
        }
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotUpdateCompleted');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventories.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['inventories'] });
      const previousData = queryClient.getQueryData(['inventories']);

      queryClient.setQueryData(['inventories'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((inventory) => inventory.inventoryId !== deletedId);
      });

      return { previousData };
    },
    onSuccess: async () => {
      deleteModal.close();
      setCurrentAdjustment(null);
      setError('');
      setDeleteError('');
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventories'], context.previousData);
      }
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.deleteFailed');
        if (err.code === 'INVENTORY_COMPLETED') {
          message = t('inventoryAdjustments.errors.cannotDeleteCompleted');
        }
        setError(message);
      } else {
        setError(t('inventoryAdjustments.errors.deleteFailed'));
      }
      deleteModal.close();
    },
  });

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...emptyAdjustment,
      adjustmentDate: today,
    });
    setCurrentAdjustment(null);
    setError('');
  };

  const handleEdit = (adjustment) => {
    if (adjustment?.statusIsFinal) return;
    setCurrentAdjustment(adjustment);
    setFormData({
      adjustmentDate: adjustment.adjustmentDate
        ? format(new Date(adjustment.adjustmentDate), 'yyyy-MM-dd')
        : null,
      statusId: adjustment.statusId || null,
      notes: adjustment.notes || null,
    });
    setError('');
    createEditModal.open(adjustment);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const data = {
      adjustmentDate: formData.adjustmentDate
        ? new Date(formData.adjustmentDate).toISOString()
        : null,
      statusId: formData.statusId || null,
      notes: formData.notes || null,
    };

    if (!currentAdjustment && !data.statusId && inventoryStatuses.length > 0) {
      data.statusId = inventoryStatuses[0].inventoryStatusId;
    }

    if (currentAdjustment) {
      updateMutation.mutate({ id: currentAdjustment.inventoryId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSelectedStatusName = () => {
    if (!formData.statusId) return '';
    const status = inventoryStatuses.find((s) => s.inventoryStatusId === formData.statusId);
    return status?.name || '';
  };

  return (
    <div className="space-y-6">
      <InventoryAdjustmentsTable
        t={t}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        inventories={enrichedInventories}
        isLoading={isLoading}
        canWriteInventory={canWriteInventory}
        onCreateAdjustment={() => {
          resetForm();
          createEditModal.open();
        }}
        onEditAdjustment={handleEdit}
        onRequestDelete={(adjustment) => {
          if (adjustment.statusIsFinal) {
            setDeleteError(t('inventoryAdjustments.errors.cannotDeleteCompleted'));
            setDeleteErrorDialogOpen(true);
            return;
          }
          setCurrentAdjustment(adjustment);
          setDeleteError('');
          deleteModal.open(adjustment);
        }}
      />

      <AlertDialog open={deleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventoryAdjustments.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteErrorDialogOpen(false);
              }}
            >
              {t('common.ok') ?? 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {currentAdjustment
                ? t('inventoryAdjustments.editAdjustment')
                : t('inventoryAdjustments.addAdjustment')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adjustmentDate">
                  {t('inventoryAdjustments.form.adjustmentDate')}
                </Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      adjustmentDate: e.target.value || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">
                  {t('inventoryAdjustments.form.status')} *
                </Label>
                <Select
                  value={formData.statusId?.toString() || ''}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      statusId: value || null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventoryAdjustments.form.status')}>
                      {getSelectedStatusName()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryStatuses.map((status) => (
                      <SelectItem
                        key={status.inventoryStatusId}
                        value={status.inventoryStatusId.toString()}
                      >
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('inventoryAdjustments.form.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value || null,
                  }))
                }
                rows={3}
                maxLength={255}
                placeholder={t('inventoryAdjustments.form.notes')}
              />
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {currentAdjustment
                  ? updateMutation.isPending
                    ? t('common.loading')
                    : t('common.save')
                  : createMutation.isPending
                  ? t('common.loading')
                  : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteModal.isOpen} onOpenChange={deleteModal.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventoryAdjustments.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventoryAdjustments.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                deleteModal.close();
                setCurrentAdjustment(null);
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentAdjustment) {
                  deleteMutation.mutate(currentAdjustment.inventoryId);
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

export default InventoryAdjustmentsPageContainer;

