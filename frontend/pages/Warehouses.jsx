import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Plus, Edit2, Trash2, Warehouse, Store, MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuardedButton, GuardedMenuItem } from '@/components/auth/PermissionControls';
import { usePermissions } from '@/hooks/usePermissions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { useModalState } from '@/hooks/useModalState';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyWarehouse = {
  name: '',
  isMarketplace: false,
  location: null,
};

const emptyStore = {
  name: '',
};

export default function Warehouses() {
  const { t } = useI18n();
  const { canWriteWarehouses, canWriteStores } = usePermissions();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('warehouses');
  const warehouseModal = useModalState(null);
  const storeModal = useModalState(null);
  const deleteModal = useModalState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState(emptyWarehouse);
  const [storeForm, setStoreForm] = useState(emptyStore);
  const [error, setError] = useState('');

  const { data: warehousesData, isLoading: loadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: storesData, isLoading: loadingStores, refetch: refetchStores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const response = await api.stores.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const stores = Array.isArray(storesData) ? storesData : [];

  // Warehouse mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data) => api.warehouses.create(data),
    onSuccess: async () => {
      warehouseModal.close();
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
      setError('');
      await refetchWarehouses();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.createFailed'));
      } else {
        setError(t('warehouses.errors.createFailed'));
      }
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => api.warehouses.update(id, data),
    onSuccess: async () => {
      warehouseModal.close();
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
      setError('');
      await refetchWarehouses();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.updateFailed'));
      } else {
        setError(t('warehouses.errors.updateFailed'));
      }
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id) => api.warehouses.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['warehouses'] });
      const previousData = queryClient.getQueryData(['warehouses']);
      
      queryClient.setQueryData(['warehouses'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((warehouse) => warehouse.warehouseId !== deletedId);
      });
      
      return { previousData };
    },
    onSuccess: async () => {
      deleteModal.close();
      setCurrentItem(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      await refetchWarehouses();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['warehouses'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.deleteFailed'));
      } else {
        setError(t('warehouses.errors.deleteFailed'));
      }
      deleteModal.close();
    },
  });

  // Store mutations
  const createStoreMutation = useMutation({
    mutationFn: (data) => api.stores.create(data),
    onSuccess: async () => {
      storeModal.close();
      setStoreForm(emptyStore);
      setCurrentItem(null);
      setError('');
      await refetchStores();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.createFailed'));
      } else {
        setError(t('warehouses.errors.createFailed'));
      }
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => api.stores.update(id, data),
    onSuccess: async () => {
      storeModal.close();
      setStoreForm(emptyStore);
      setCurrentItem(null);
      setError('');
      await refetchStores();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.updateFailed'));
      } else {
        setError(t('warehouses.errors.updateFailed'));
      }
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (id) => api.stores.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['stores'] });
      const previousData = queryClient.getQueryData(['stores']);
      
      queryClient.setQueryData(['stores'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((store) => store.storeId !== deletedId);
      });
      
      return { previousData };
    },
    onSuccess: async () => {
      deleteModal.close();
      setCurrentItem(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['stores'] });
      await refetchStores();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['stores'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || t('warehouses.errors.deleteFailed'));
      } else {
        setError(t('warehouses.errors.deleteFailed'));
      }
      deleteModal.close();
    },
  });

  const handleEditWarehouse = (warehouse) => {
    setCurrentItem(warehouse);
    setWarehouseForm({
      name: warehouse.name || '',
      isMarketplace: !!warehouse.isMarketplace,
      location: warehouse.location || null,
    });
    warehouseModal.open(warehouse);
  };

  const handleEditStore = (store) => {
    setCurrentItem(store);
    setStoreForm({
      name: store.name || '',
    });
    storeModal.open(store);
  };

  const handleDelete = (item, type) => {
    setCurrentItem(item);
    setDeleteType(type);
    deleteModal.open({ item, type });
  };

  const handleWarehouseSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const name = warehouseForm.name.trim();
    if (!name) {
      setError(t('warehouses.form.nameRequired'));
      return;
    }

    const data = {
      name,
      isMarketplace: !!warehouseForm.isMarketplace,
      location: warehouseForm.location?.trim() || null,
    };

    if (currentItem) {
      updateWarehouseMutation.mutate({ id: currentItem.warehouseId, data });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const handleStoreSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const data = {
      name: storeForm.name.trim(),
    };

    if (!data.name) {
      setError(t('warehouses.form.storeNameRequired'));
      return;
    }

    if (currentItem) {
      updateStoreMutation.mutate({ id: currentItem.storeId, data });
    } else {
      createStoreMutation.mutate(data);
    }
  };

  const warehouseColumns = [
    {
      accessorKey: 'name',
      header: t('warehouses.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg dark:bg-indigo-500/20">
            <Warehouse className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'isMarketplace',
      header: t('warehouses.table.marketplace'),
      cell: ({ row }) => {
        const isMarketplace = !!row.original.isMarketplace;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              isMarketplace
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isMarketplace ? t('warehouses.table.marketplaceYes') : t('warehouses.table.marketplaceNo')}
          </span>
        );
      },
    },
    {
      accessorKey: 'location',
      header: t('warehouses.table.location'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.location || '—'}
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
              <Link to={`${createPageUrl('Stock')}?warehouse=${row.original.warehouseId}`}>
                <Eye className="w-4 h-4 mr-2" />
                {t('warehouses.table.stock')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <GuardedMenuItem allowed={canWriteWarehouses} onClick={() => handleEditWarehouse(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <GuardedMenuItem
              allowed={canWriteWarehouses}
              onClick={() => handleDelete(row.original, 'warehouse')}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const storeColumns = [
    {
      accessorKey: 'name',
      header: t('warehouses.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/20">
            <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
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
            <GuardedMenuItem allowed={canWriteStores} onClick={() => handleEditStore(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <GuardedMenuItem
              allowed={canWriteStores}
              onClick={() => handleDelete(row.original, 'store')}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('warehouses.title')} 
        description={t('warehouses.description')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="warehouses" className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              {t('warehouses.tabs.warehouses')}
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t('warehouses.tabs.stores')}
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'warehouses' ? (
            <GuardedButton
              allowed={canWriteWarehouses}
              onClick={() => {
                setCurrentItem(null);
                setWarehouseForm(emptyWarehouse);
                warehouseModal.open();
                setError('');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('warehouses.addWarehouse')}
            </GuardedButton>
          ) : (
            <GuardedButton
              allowed={canWriteStores}
              onClick={() => {
                setCurrentItem(null);
                setStoreForm(emptyStore);
                storeModal.open();
                setError('');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('warehouses.addStore')}
            </GuardedButton>
          )}
        </div>

        <TabsContent value="warehouses">
          <DataTable
            columns={warehouseColumns}
            data={warehouses}
            searchPlaceholder={t('warehouses.searchPlaceholder')}
            emptyMessage={t('warehouses.emptyMessage')}
            isLoading={loadingWarehouses}
          />
        </TabsContent>

        <TabsContent value="stores">
          <DataTable
            columns={storeColumns}
            data={stores}
            searchPlaceholder={t('warehouses.storeSearchPlaceholder')}
            emptyMessage={t('warehouses.storeEmptyMessage')}
            isLoading={loadingStores}
          />
        </TabsContent>
      </Tabs>

      {/* Warehouse Dialog */}
      <Dialog 
        open={warehouseModal.isOpen} 
        onOpenChange={(open) => {
          warehouseModal.setIsOpen(open);
          if (!open) {
            setWarehouseForm(emptyWarehouse);
            setCurrentItem(null);
            setError('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? t('warehouses.editWarehouse') : t('warehouses.addWarehouse')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWarehouseSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="wh-name">{t('warehouses.form.name')} *</Label>
              <Input
                id="wh-name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-location">{t('warehouses.form.location')}</Label>
              <Input
                id="wh-location"
                value={warehouseForm.location || ''}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value || null })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="warehouse-is-marketplace" className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('warehouses.form.isMarketplace')}
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('warehouses.form.isMarketplaceHint')}
                </p>
              </div>
              <input
                id="warehouse-is-marketplace"
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={!!warehouseForm.isMarketplace}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, isMarketplace: e.target.checked })}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  warehouseModal.close();
                  setWarehouseForm(emptyWarehouse);
                  setCurrentItem(null);
                  setError('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
              >
                {currentItem ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Store Dialog */}
      <Dialog 
        open={storeModal.isOpen} 
        onOpenChange={(open) => {
          storeModal.setIsOpen(open);
          if (!open) {
            setStoreForm(emptyStore);
            setCurrentItem(null);
            setError('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? t('warehouses.editStore') : t('warehouses.addStore')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStoreSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="store-name">{t('warehouses.form.storeName')} *</Label>
              <Input
                id="store-name"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  storeModal.close();
                  setStoreForm(emptyStore);
                  setCurrentItem(null);
                  setError('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
              >
                {currentItem ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteModal.isOpen} onOpenChange={deleteModal.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('warehouses.deleteConfirm.title')} {deleteType === 'warehouse' ? t('warehouses.tabs.warehouses') : t('warehouses.tabs.stores')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'warehouse' 
                ? t('warehouses.deleteConfirm.warehouseDescription', { name: currentItem?.name || '' })
                : t('warehouses.deleteConfirm.storeDescription', { name: currentItem?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                deleteModal.close();
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (deleteType === 'warehouse') {
                  deleteWarehouseMutation.mutate(currentItem.warehouseId);
                } else {
                  deleteStoreMutation.mutate(currentItem.storeId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteWarehouseMutation.isPending || deleteStoreMutation.isPending}
            >
              {deleteWarehouseMutation.isPending || deleteStoreMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}