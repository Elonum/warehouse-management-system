import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [error, setError] = useState('');

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];

  const createMutation = useMutation({
    mutationFn: (data) => api.products.create(data),
    onSuccess: async () => {
      setDialogOpen(false);
      resetForm();
      setError('');
      await refetch();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('products.errors.createFailed'));
      } else {
        setError(t('products.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.products.update(id, data),
    onSuccess: async () => {
      setDialogOpen(false);
      resetForm();
      setError('');
      await refetch();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('products.errors.updateFailed'));
      } else {
        setError(t('products.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.products.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousData = queryClient.getQueryData(['products']);
      
      queryClient.setQueryData(['products'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((product) => product.productId !== deletedId);
      });
      
      return { previousData };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['products'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || t('products.errors.deleteFailed'));
      } else {
        setError(t('products.errors.deleteFailed'));
      }
      setDeleteDialogOpen(false);
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
      setError(t('products.form.articleRequired'));
      return;
    }

    if (!data.barcode) {
      setError(t('products.form.barcodeRequired'));
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
      header: t('products.table.article'),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
          {row.original.article}
        </span>
      ),
    },
    {
      accessorKey: 'barcode',
      header: t('products.table.barcode'),
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
      header: t('products.table.weight'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.unitWeight ? `${row.original.unitWeight} г` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'unitCost',
      header: t('products.table.price'),
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
                {t('products.table.stock')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original)}
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
        title={t('products.title')} 
        description={t('products.description')}
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('products.addProduct')}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder={t('products.searchPlaceholder')}
        emptyMessage={t('products.emptyMessage')}
        isLoading={isLoading}
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
              {currentProduct ? t('products.editProduct') : t('products.addProduct')}
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
                <Label htmlFor="article">{t('products.form.article')} *</Label>
                <Input
                  id="article"
                  value={formData.article}
                  onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">{t('products.form.barcode')} *</Label>
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
                <Label htmlFor="unitWeight">{t('products.form.weight')} *</Label>
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
                <Label htmlFor="unitCost">{t('products.form.price')}</Label>
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentProduct ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.deleteConfirm.description', { article: currentProduct?.article || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (currentProduct?.productId) {
                  deleteMutation.mutate(currentProduct.productId)
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
