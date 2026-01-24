import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ClipboardList, 
  MoreHorizontal, 
  Eye,
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
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyAdjustment = {
  adjustmentDate: null,
  statusId: null,
  notes: null,
};

export default function InventoryAdjustments() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState(null);
  const [formData, setFormData] = useState(emptyAdjustment);
  const [error, setError] = useState('');

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

  const enrichedInventories = useMemo(() => {
    const statusMap = new Map(inventoryStatuses.map(s => [s.inventoryStatusId, s.name]));

    return inventories.map((inventory, index) => ({
      ...inventory,
      statusName: statusMap.get(inventory.statusId) || 'Не указан',
      rowNumber: index + 1,
    }));
  }, [inventories, inventoryStatuses]);

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
        setError(err.message || 'Ошибка создания инвентаризации');
      } else {
        setError('Ошибка создания инвентаризации');
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
        setError(err.message || 'Ошибка обновления инвентаризации');
      } else {
        setError('Ошибка обновления инвентаризации');
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
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventories'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка удаления инвентаризации');
      } else {
        setError('Ошибка удаления инвентаризации');
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData(emptyAdjustment);
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

    // StatusId is required for create, but can be null for draft
    if (!currentAdjustment && !data.statusId) {
      // Find draft status or use first available status
      const draftStatus = inventoryStatuses.find(s => s.name.toLowerCase().includes('черновик') || s.name.toLowerCase().includes('draft'));
      if (draftStatus) {
        data.statusId = draftStatus.inventoryStatusId;
      } else if (inventoryStatuses.length > 0) {
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
      header: '№',
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
      header: 'Дата инвентаризации',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.adjustmentDate ? format(new Date(row.original.adjustmentDate), 'dd.MM.yyyy', { locale: ru }) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'statusName',
      header: 'Статус',
      cell: ({ row }) => <StatusBadge status={row.original.statusName || 'Не указан'} />,
    },
    {
      accessorKey: 'totalReceiptQty',
      header: 'Поступление',
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {row.original.totalReceiptQty > 0 ? `+${row.original.totalReceiptQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalWriteOffQty',
      header: 'Списание',
      cell: ({ row }) => (
        <span className="font-medium text-rose-600 dark:text-rose-400">
          {row.original.totalWriteOffQty > 0 ? `-${row.original.totalWriteOffQty.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Примечания',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Создано',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
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
                Детали
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { setCurrentAdjustment(row.original); setDeleteDialogOpen(true); }}
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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Инвентаризации" 
        description="Управление инвентаризациями и корректировками остатков"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Новая инвентаризация
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={enrichedInventories}
        isLoading={isLoading}
        searchPlaceholder="Поиск инвентаризаций..."
        emptyMessage="Инвентаризации не найдены"
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
              {currentAdjustment ? 'Редактировать инвентаризацию' : 'Новая инвентаризация'}
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
                <Label htmlFor="adjustmentDate">Дата инвентаризации</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={formData.adjustmentDate || ''}
                  onChange={(e) => setFormData({ ...formData, adjustmentDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusId">Статус *</Label>
                <Select
                  value={formData.statusId?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, statusId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус">{getSelectedStatusName()}</SelectValue>
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
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                placeholder="Введите примечания к инвентаризации"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentAdjustment ? (updateMutation.isPending ? 'Сохранение...' : 'Сохранить') : (createMutation.isPending ? 'Создание...' : 'Создать')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить инвентаризацию</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить эту инвентаризацию? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCurrentAdjustment(null);
            }}>
              Отмена
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
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
