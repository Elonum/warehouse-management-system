import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ClipboardList, 
  MoreHorizontal, 
  Eye,
  HelpCircle,
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
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyAdjustment = {
  adjustmentDate: null,
  statusId: null,
  notes: null,
};

export default function InventoryAdjustments() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const filteredInventories = useMemo(() => {
    if (statusFilter === 'final') {
      return enrichedInventories.filter(inv => inv.statusIsFinal);
    }
    if (statusFilter === 'nonFinal') {
      return enrichedInventories.filter(inv => !inv.statusIsFinal);
    }
    return enrichedInventories;
  }, [enrichedInventories, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => api.inventories.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventories'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.createFailed');
        if (err.code === 'INVALID_REQUEST') {
          // Бэкенд может вернуть "statusId is required" и подобные текстовые сообщения
          if (err.message?.includes('statusId is required')) {
            message = t('inventoryAdjustments.errors.statusRequired');
          }
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
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('inventoryAdjustments.errors.updateFailed');
        if (err.code === 'INVALID_REQUEST') {
          if (err.message?.includes('statusId is required')) {
            message = t('inventoryAdjustments.errors.statusRequired');
          }
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
      setDeleteDialogOpen(false);
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
      setDeleteDialogOpen(false);
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
    setCurrentAdjustment(adjustment);
    setFormData({
      adjustmentDate: adjustment.adjustmentDate ? format(new Date(adjustment.adjustmentDate), 'yyyy-MM-dd') : null,
      statusId: adjustment.statusId || null,
      notes: adjustment.notes || null,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const data = {
      adjustmentDate: formData.adjustmentDate ? new Date(formData.adjustmentDate).toISOString() : null,
      statusId: formData.statusId || null,
      notes: formData.notes || null,
    };

    if (!currentAdjustment && !data.statusId) {
      if (inventoryStatuses.length > 0) {
        data.statusId = inventoryStatuses[0].inventoryStatusId;
      }
    }

    if (currentAdjustment) {
      updateMutation.mutate({ id: currentAdjustment.inventoryId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSelectedStatusName = () => {
    if (!formData.statusId) return '';
    const status = inventoryStatuses.find(s => s.inventoryStatusId === formData.statusId);
    return status?.name || '';
  };

  const columns = [
    {
      accessorKey: 'rowNumber',
      header: t('inventoryAdjustments.table.number'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.rowNumber}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'adjustmentDate',
      header: t('inventoryAdjustments.table.adjustmentDate'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.adjustmentDate ? format(new Date(row.original.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'statusName',
      header: t('inventoryAdjustments.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.statusName || t('common.notSpecified')}
          className={row.original.statusIsFinal ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : ''}
        />
      ),
    },
    {
      accessorKey: 'totalReceiptQty',
      header: t('inventoryAdjustments.table.receipt'),
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {row.original.totalReceiptQty > 0 ? `+${row.original.totalReceiptQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalWriteOffQty',
      header: t('inventoryAdjustments.table.writeOff'),
      cell: ({ row }) => (
        <span className="font-medium text-rose-600 dark:text-rose-400">
          {row.original.totalWriteOffQty > 0 ? `-${row.original.totalWriteOffQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: t('inventoryAdjustments.table.notes'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: (
        <div className="flex items-center gap-1">
          <span>{t('inventoryAdjustments.table.createdAt')}</span>
          <span
            className="relative inline-flex items-center group"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs font-normal text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {t('inventoryAdjustments.table.createdAtHint')}
            </span>
          </span>
        </div>
      ),
      cell: ({ row }) => (
        <span
          className="text-slate-600 dark:text-slate-400"
          title={[
            t('inventoryAdjustments.meta.createdByAt', {
              user: row.original.createdByName || t('common.notSpecified'),
              datetime: format(new Date(row.original.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }),
            }),
            row.original.statusIsFinal &&
            row.original.completedByName &&
            row.original.completedAt
              ? t('inventoryAdjustments.meta.completedByAt', {
                  user: row.original.completedByName,
                  datetime: format(new Date(row.original.completedAt), 'dd.MM.yyyy HH:mm', { locale: ru }),
                })
              : null,
          ]
            .filter(Boolean)
            .join('\n')}
        >
          {format(new Date(row.original.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
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
              <Link to={`${createPageUrl('InventoryAdjustmentDetails')}?id=${row.original.inventoryId}`}>
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
              onClick={() => {
                if (row.original.statusIsFinal) {
                  setDeleteError(t('inventoryAdjustments.errors.cannotDeleteCompleted'));
                  setDeleteErrorDialogOpen(true);
                  return;
                }
                setCurrentAdjustment(row.original);
                setDeleteError('');
                setDeleteDialogOpen(true);
              }}
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
        title={t('inventoryAdjustments.title')} 
        description={t('inventoryAdjustments.description')}
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inventoryAdjustments.addAdjustment')}
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
        <span>{t('inventoryAdjustments.filters.status')}</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {statusFilter === 'all'
                ? t('inventoryAdjustments.filters.all')
                : statusFilter === 'final'
                ? t('inventoryAdjustments.filters.final')
                : t('inventoryAdjustments.filters.nonFinal')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventoryAdjustments.filters.all')}</SelectItem>
            <SelectItem value="final">{t('inventoryAdjustments.filters.final')}</SelectItem>
            <SelectItem value="nonFinal">{t('inventoryAdjustments.filters.nonFinal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredInventories}
        isLoading={isLoading}
        searchPlaceholder={t('inventoryAdjustments.searchPlaceholder')}
        emptyMessage={t('inventoryAdjustments.emptyMessage')}
        onRowDoubleClick={(row) => {
          if (!row.inventoryId) return;
          navigate(`${createPageUrl('InventoryAdjustmentDetails')}?id=${row.inventoryId}`);
        }}
      />

      <AlertDialog open={deleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventoryAdjustments.deleteConfirm.title')}</AlertDialogTitle>
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
              }}
            >
              {t('common.ok') ?? 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {currentAdjustment ? t('inventoryAdjustments.editAdjustment') : t('inventoryAdjustments.addAdjustment')}
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
                <Label htmlFor="adjustmentDate">{t('inventoryAdjustments.form.adjustmentDate')}</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate || ''}
                  onChange={(e) => setFormData({ ...formData, adjustmentDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">{t('inventoryAdjustments.form.status')} *</Label>
                <Select
                  value={formData.statusId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, statusId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventoryAdjustments.form.status')}>{getSelectedStatusName()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryStatuses.map(status => (
                      <SelectItem key={status.inventoryStatusId} value={status.inventoryStatusId.toString()}>
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
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                maxLength={255}
                placeholder={t('inventoryAdjustments.form.notes')}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentAdjustment ? (updateMutation.isPending ? t('common.loading') : t('common.save')) : (createMutation.isPending ? t('common.loading') : t('common.create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventoryAdjustments.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventoryAdjustments.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCurrentAdjustment(null);
            }}>
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
