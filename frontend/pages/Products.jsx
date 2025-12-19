import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { Plus, Edit2, Trash2, Package, Eye, History, MoreHorizontal } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyProduct = {
  article: '',
  name: '',
  barcode: '',
  unit_weight: '',
  base_unit_cost: '',
  category: '',
  status: 'active'
};

export default function Products() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
    },
  });

  const resetForm = () => {
    setFormData(emptyProduct);
    setCurrentProduct(null);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      article: product.article || '',
      name: product.name || '',
      barcode: product.barcode || '',
      unit_weight: product.unit_weight || '',
      base_unit_cost: product.base_unit_cost || '',
      category: product.category || '',
      status: product.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = (product) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      unit_weight: formData.unit_weight ? parseFloat(formData.unit_weight) : null,
      base_unit_cost: formData.base_unit_cost ? parseFloat(formData.base_unit_cost) : null,
    };

    if (currentProduct) {
      updateMutation.mutate({ id: currentProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      accessorKey: 'article',
      header: 'Артикул',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
          {row.original.article}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Наименование',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Package className="w-5 h-5 text-slate-500" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'barcode',
      header: 'Штрихкод',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
          {row.original.barcode || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'unit_weight',
      header: 'Вес (кг)',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.unit_weight ? `${row.original.unit_weight} kg` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'base_unit_cost',
      header: 'Базовая цена',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.base_unit_cost ? `$${row.original.base_unit_cost.toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
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
            <DropdownMenuItem asChild>
              <Link to={`${createPageUrl('Stock')}?product=${row.original.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Остатки
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`${createPageUrl('StockMovements')}?product=${row.original.id}`}>
                <History className="w-4 h-4 mr-2" />
                История движений
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original)}
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
        title="Товары" 
        description="Управление каталогом товаров"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder="Поиск товаров..."
        emptyMessage="Товары не найдены"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentProduct ? 'Редактировать товар' : 'Добавить товар'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article">Артикул *</Label>
                <Input
                  id="article"
                  value={formData.article}
                  onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Штрихкод</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Название товара *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_weight">Вес (кг)</Label>
                <Input
                  id="unit_weight"
                  type="number"
                  step="0.01"
                  value={formData.unit_weight}
                  onChange={(e) => setFormData({ ...formData, unit_weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_unit_cost">Базовая цена ($)</Label>
                <Input
                  id="base_unit_cost"
                  type="number"
                  step="0.01"
                  value={formData.base_unit_cost}
                  onChange={(e) => setFormData({ ...formData, base_unit_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активный</SelectItem>
                    <SelectItem value="inactive">Неактивный</SelectItem>
                    <SelectItem value="discontinued">Снят с производства</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentProduct ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить "{currentProduct?.name}"? Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentProduct.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}