import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { Plus, Edit2, Trash2, Warehouse, Store, MoreHorizontal } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';

const emptyWarehouse = {
  name: '',
  warehouseTypeId: null,
  location: null,
};

const emptyStore = {
  name: '',
};

export default function Warehouses() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('warehouses');
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const { data: warehouseTypesData } = useQuery({
    queryKey: ['warehouseTypes'],
    queryFn: async () => {
      const response = await api.warehouseTypes.list({ limit: 100, offset: 0 });
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
  const warehouseTypes = Array.isArray(warehouseTypesData) ? warehouseTypesData : [];

  // Warehouse mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data) => api.warehouses.create(data),
    onSuccess: async () => {
      setWarehouseDialogOpen(false);
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
      setError('');
      await refetchWarehouses();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка создания склада');
      } else {
        setError('Ошибка создания склада');
      }
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => api.warehouses.update(id, data),
    onSuccess: async () => {
      setWarehouseDialogOpen(false);
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
      setError('');
      await refetchWarehouses();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка обновления склада');
      } else {
        setError('Ошибка обновления склада');
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
      setDeleteDialogOpen(false);
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
        setError(err.message || 'Ошибка удаления склада');
      } else {
        setError('Ошибка удаления склада');
      }
      setDeleteDialogOpen(false);
    },
  });

  // Store mutations
  const createStoreMutation = useMutation({
    mutationFn: (data) => api.stores.create(data),
    onSuccess: async () => {
      setStoreDialogOpen(false);
      setStoreForm(emptyStore);
      setCurrentItem(null);
      setError('');
      await refetchStores();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка создания магазина');
      } else {
        setError('Ошибка создания магазина');
      }
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => api.stores.update(id, data),
    onSuccess: async () => {
      setStoreDialogOpen(false);
      setStoreForm(emptyStore);
      setCurrentItem(null);
      setError('');
      await refetchStores();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка обновления магазина');
      } else {
        setError('Ошибка обновления магазина');
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
      setDeleteDialogOpen(false);
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
        setError(err.message || 'Ошибка удаления магазина');
      } else {
        setError('Ошибка удаления магазина');
      }
      setDeleteDialogOpen(false);
    },
  });

  const handleEditWarehouse = (warehouse) => {
    setCurrentItem(warehouse);
    setWarehouseForm({
      name: warehouse.name || '',
      warehouseTypeId: warehouse.warehouseTypeId || null,
      location: warehouse.location || null,
    });
    setWarehouseDialogOpen(true);
  };

  const handleEditStore = (store) => {
    setCurrentItem(store);
    setStoreForm({
      name: store.name || '',
    });
    setStoreDialogOpen(true);
  };

  const handleDelete = (item, type) => {
    setCurrentItem(item);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleWarehouseSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const name = warehouseForm.name.trim();
    if (!name) {
      setError('Название склада обязательно');
      return;
    }

    const data = {
      name,
      warehouseTypeId: warehouseForm.warehouseTypeId || null,
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
      setError('Название магазина обязательно');
      return;
    }

    if (currentItem) {
      updateStoreMutation.mutate({ id: currentItem.storeId, data });
    } else {
      createStoreMutation.mutate(data);
    }
  };

  const getWarehouseTypeName = (warehouseTypeId) => {
    if (!warehouseTypeId) return '—';
    const type = warehouseTypes.find(t => t.warehouseTypeId === warehouseTypeId);
    return type ? type.name : '—';
  };

  const getSelectedWarehouseTypeName = () => {
    if (!warehouseForm.warehouseTypeId) return '';
    const type = warehouseTypes.find(t => t.warehouseTypeId === warehouseForm.warehouseTypeId);
    return type ? type.name : '';
  };

  const warehouseColumns = [
    {
      accessorKey: 'name',
      header: 'Название склада',
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
      accessorKey: 'warehouseTypeId',
      header: 'Тип',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {getWarehouseTypeName(row.original.warehouseTypeId)}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Адрес',
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
            <DropdownMenuItem onClick={() => handleEditWarehouse(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original, 'warehouse')}
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

  const storeColumns = [
    {
      accessorKey: 'name',
      header: 'Название магазина',
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
            <DropdownMenuItem onClick={() => handleEditStore(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original, 'store')}
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
        title="Склады и магазины" 
        description="Управление складами и торговыми площадками"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="warehouses" className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              Склады
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Магазины
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'warehouses' ? (
            <Button onClick={() => { setCurrentItem(null); setWarehouseForm(emptyWarehouse); setWarehouseDialogOpen(true); setError(''); }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить склад
            </Button>
          ) : (
            <Button onClick={() => { setCurrentItem(null); setStoreForm(emptyStore); setStoreDialogOpen(true); setError(''); }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить магазин
            </Button>
          )}
        </div>

        <TabsContent value="warehouses">
          <DataTable
            columns={warehouseColumns}
            data={warehouses}
            searchPlaceholder="Поиск складов..."
            emptyMessage="Склады не найдены"
            isLoading={loadingWarehouses}
          />
        </TabsContent>

        <TabsContent value="stores">
          <DataTable
            columns={storeColumns}
            data={stores}
            searchPlaceholder="Поиск магазинов..."
            emptyMessage="Магазины не найдены"
            isLoading={loadingStores}
          />
        </TabsContent>
      </Tabs>

      {/* Warehouse Dialog */}
      <Dialog 
        open={warehouseDialogOpen} 
        onOpenChange={(open) => {
          setWarehouseDialogOpen(open);
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
              {currentItem ? 'Редактировать склад' : 'Добавить склад'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWarehouseSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="wh-name">Название склада *</Label>
              <Input
                id="wh-name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-type">Тип склада</Label>
              <Select
                value={warehouseForm.warehouseTypeId ? warehouseForm.warehouseTypeId.toString() : ''}
                onValueChange={(value) => {
                  setWarehouseForm({ 
                    ...warehouseForm, 
                    warehouseTypeId: value && value !== '' ? value : null 
                  });
                }}
              >
                <SelectTrigger id="wh-type">
                  <SelectValue placeholder="Выберите тип">
                    {getSelectedWarehouseTypeName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не указан</SelectItem>
                  {warehouseTypes.map((type) => (
                    <SelectItem key={type.warehouseTypeId} value={type.warehouseTypeId.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-location">Адрес</Label>
              <Input
                id="wh-location"
                value={warehouseForm.location || ''}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value || null })}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setWarehouseDialogOpen(false);
                  setWarehouseForm(emptyWarehouse);
                  setCurrentItem(null);
                  setError('');
                }}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
              >
                {currentItem ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Store Dialog */}
      <Dialog 
        open={storeDialogOpen} 
        onOpenChange={(open) => {
          setStoreDialogOpen(open);
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
              {currentItem ? 'Редактировать магазин' : 'Добавить магазин'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStoreSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="store-name">Название магазина *</Label>
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
                  setStoreDialogOpen(false);
                  setStoreForm(emptyStore);
                  setCurrentItem(null);
                  setError('');
                }}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
              >
                {currentItem ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Удалить {deleteType === 'warehouse' ? 'склад' : 'магазин'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить "{currentItem?.name}"? Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Отмена
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
              {deleteWarehouseMutation.isPending || deleteStoreMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}