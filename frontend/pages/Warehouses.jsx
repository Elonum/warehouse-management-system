import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
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
import StatusBadge from '@/components/ui/StatusBadge';

const emptyWarehouse = {
  name: '',
  warehouse_type: 'main',
  location: '',
  capacity: '',
  status: 'active'
};

const emptyStore = {
  name: '',
  marketplace: '',
  status: 'active'
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

  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list('-created_date'),
  });

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.entities.Store.list('-created_date'),
  });

  // Warehouse mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data) => api.entities.Warehouse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setWarehouseDialogOpen(false);
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Warehouse.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setWarehouseDialogOpen(false);
      setWarehouseForm(emptyWarehouse);
      setCurrentItem(null);
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id) => api.entities.Warehouse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setDeleteDialogOpen(false);
      setCurrentItem(null);
    },
  });

  // Store mutations
  const createStoreMutation = useMutation({
    mutationFn: (data) => api.entities.Store.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setStoreDialogOpen(false);
      setStoreForm(emptyStore);
      setCurrentItem(null);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Store.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setStoreDialogOpen(false);
      setStoreForm(emptyStore);
      setCurrentItem(null);
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (id) => api.entities.Store.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setDeleteDialogOpen(false);
      setCurrentItem(null);
    },
  });

  const handleEditWarehouse = (warehouse) => {
    setCurrentItem(warehouse);
    setWarehouseForm({
      name: warehouse.name || '',
      warehouse_type: warehouse.warehouse_type || 'main',
      location: warehouse.location || '',
      capacity: warehouse.capacity || '',
      status: warehouse.status || 'active'
    });
    setWarehouseDialogOpen(true);
  };

  const handleEditStore = (store) => {
    setCurrentItem(store);
    setStoreForm({
      name: store.name || '',
      marketplace: store.marketplace || '',
      status: store.status || 'active'
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
    const data = {
      ...warehouseForm,
      capacity: warehouseForm.capacity ? parseInt(warehouseForm.capacity) : null,
    };
    if (currentItem) {
      updateWarehouseMutation.mutate({ id: currentItem.id, data });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const handleStoreSubmit = (e) => {
    e.preventDefault();
    if (currentItem) {
      updateStoreMutation.mutate({ id: currentItem.id, data: storeForm });
    } else {
      createStoreMutation.mutate(storeForm);
    }
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
      accessorKey: 'warehouse_type',
      header: 'Тип',
      cell: ({ row }) => <StatusBadge status={row.original.warehouse_type} />,
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
      accessorKey: 'capacity',
      header: 'Вместимость',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.capacity ? row.original.capacity.toLocaleString() : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
      accessorKey: 'marketplace',
      header: 'Площадка',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.marketplace || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            <Button onClick={() => { setCurrentItem(null); setWarehouseForm(emptyWarehouse); setWarehouseDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить склад
            </Button>
          ) : (
            <Button onClick={() => { setCurrentItem(null); setStoreForm(emptyStore); setStoreDialogOpen(true); }}>
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
          />
        </TabsContent>

        <TabsContent value="stores">
          <DataTable
            columns={storeColumns}
            data={stores}
            searchPlaceholder="Поиск магазинов..."
            emptyMessage="Магазины не найдены"
          />
        </TabsContent>
      </Tabs>

      {/* Warehouse Dialog */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? 'Редактировать склад' : 'Добавить склад'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWarehouseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Название склада *</Label>
              <Input
                id="wh-name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-type">Тип</Label>
                <Select
                  value={warehouseForm.warehouse_type}
                  onValueChange={(value) => setWarehouseForm({ ...warehouseForm, warehouse_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Основной</SelectItem>
                    <SelectItem value="distribution">Распределительный</SelectItem>
                    <SelectItem value="transit">Транзитный</SelectItem>
                    <SelectItem value="returns">Возвратов</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-capacity">Вместимость</Label>
                <Input
                  id="wh-capacity"
                  type="number"
                  value={warehouseForm.capacity}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-location">Адрес</Label>
              <Input
                id="wh-location"
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-status">Статус</Label>
              <Select
                value={warehouseForm.status}
                onValueChange={(value) => setWarehouseForm({ ...warehouseForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="inactive">Неактивный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {currentItem ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Store Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? 'Edit Store' : 'Add New Store'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStoreSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name *</Label>
              <Input
                id="store-name"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-marketplace">Marketplace</Label>
              <Input
                id="store-marketplace"
                value={storeForm.marketplace}
                onChange={(e) => setStoreForm({ ...storeForm, marketplace: e.target.value })}
                placeholder="e.g., Amazon, eBay, Shopify"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-status">Status</Label>
              <Select
                value={storeForm.status}
                onValueChange={(value) => setStoreForm({ ...storeForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStoreDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {currentItem ? 'Update' : 'Create'}
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
              Delete {deleteType === 'warehouse' ? 'Warehouse' : 'Store'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteType === 'warehouse') {
                  deleteWarehouseMutation.mutate(currentItem.id);
                } else {
                  deleteStoreMutation.mutate(currentItem.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}