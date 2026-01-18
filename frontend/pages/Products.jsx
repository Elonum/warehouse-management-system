import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
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
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyProduct = {
  article: '',
  barcode: '',
  unitWeight: 0,
  unitCost: null,
};

export default function Products() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [error, setError] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list({ limit: 1000, offset: 0 }),
  });

  const products = productsData || [];

  const createMutation = useMutation({
    mutationFn: (data) => api.products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка создания товара');
      } else {
        setError('Ошибка создания товара');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.products.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка обновления товара');
      } else {
        setError('Ошибка обновления товара');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка удаления товара');
      } else {
        setError('Ошибка удаления товара');
      }
    },
  });

  const resetForm = () => {
    setFormData(emptyProduct);
    setCurrentProduct(null);
    setError('');
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      article: product.article || '',
      barcode: product.barcode || '',
      unitWeight: product.unitWeight || 0,
      unitCost: product.unitCost || null,
    });
    setDialogOpen(true);
  };

  const handleDelete = (product) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const data = {
      article: formData.article.trim(),
      barcode: formData.barcode.trim(),
      unitWeight: parseInt(formData.unitWeight) || 0,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
    };

    if (!data.article) {
      setError('Артикул обязателен для заполнения');
      return;
    }

    if (!data.barcode) {
      setError('Штрихкод обязателен для заполнения');
      return;
    }

    if (currentProduct) {
      updateMutation.mutate({ id: currentProduct.productId, data });
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
      accessorKey: 'barcode',
      header: 'Штрихкод',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Package className="w-5 h-5 text-slate-500" />
          </div>
          <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
            {row.original.barcode || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'unitWeight',
      header: 'Вес (г)',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.unitWeight ? `${row.original.unitWeight} г` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'unitCost',
      header: 'Цена',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.unitCost ? `₽${row.original.unitCost.toFixed(2)}` : '—'}
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
              <Link to={`${createPageUrl('Stock')}?product=${row.original.productId}`}>
                <Eye className="w-4 h-4 mr-2" />
                Остатки
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
        isLoading={isLoading}
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
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
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
                <Label htmlFor="barcode">Штрихкод *</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitWeight">Вес (г) *</Label>
                <Input
                  id="unitWeight"
                  type="number"
                  min="0"
                  value={formData.unitWeight}
                  onChange={(e) => setFormData({ ...formData, unitWeight: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Цена (₽)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost || ''}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
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
              Вы уверены, что хотите удалить товар "{currentProduct?.article}"? Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentProduct.productId)}
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
