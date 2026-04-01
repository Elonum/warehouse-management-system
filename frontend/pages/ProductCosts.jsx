import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { Plus, Edit2, Trash2, DollarSign, MoreHorizontal, Package } from 'lucide-react';
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
import { format } from 'date-fns';

const emptyCost = {
  productId: null,
  periodStart: null,
  periodEnd: null,
  unitCostToWarehouse: null,
  notes: null,
};

export default function ProductCosts() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentCost, setCurrentCost] = useState(null);
  const [formData, setFormData] = useState(emptyCost);
  const [error, setError] = useState('');

  const { data: productCostsData, isLoading, refetch } = useQuery({
    queryKey: ['productCosts'],
    queryFn: async () => {
      const response = await api.productCosts.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const productCosts = Array.isArray(productCostsData) ? productCostsData : [];
  const products = Array.isArray(productsData) ? productsData : [];

  // Enrich product costs with product names
  const getProductDisplay = (product) => {
    if (!product) return t('productCosts.unknownProduct');
    const primary = product.article || product.name || `ID: ${product.productId}`;
    const barcode = product.barcode
      ? `, ${t('productCosts.barcodeLabel')}: ${product.barcode}`
      : '';
    return `${primary}${barcode}`;
  };

  const enrichedProductCosts = useMemo(() => {
    const productMap = new Map(products.map(p => [p.productId, p]));

    return productCosts.map(cost => {
      const product = cost.productId ? productMap.get(cost.productId) : null;
      return {
        ...cost,
        productName: product ? getProductDisplay(product) : t('productCosts.unknownProduct'),
        productArticle: product?.article || product?.name || '',
        productBarcode: product?.barcode || '',
      };
    });
  }, [productCosts, products]);

  const createMutation = useMutation({
    mutationFn: (data) => api.productCosts.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['productCosts'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('productCosts.errors.createFailed'));
      } else {
        setError(t('productCosts.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.productCosts.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['productCosts'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('productCosts.errors.updateFailed'));
      } else {
        setError(t('productCosts.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.productCosts.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['productCosts'] });
      const previousData = queryClient.getQueryData(['productCosts']);

      queryClient.setQueryData(['productCosts'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((cost) => cost.costId !== deletedId);
      });

      return { previousData };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setCurrentCost(null);
      setError('');
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['productCosts'], context.previousData);
      }
      if (err instanceof ApiError) {
        setError(err.message || t('productCosts.errors.deleteFailed'));
      } else {
        setError(t('productCosts.errors.deleteFailed'));
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData(emptyCost);
    setCurrentCost(null);
    setError('');
  };

  const handleEdit = (cost) => {
    setCurrentCost(cost);
    setFormData({
      productId: cost.productId || null,
      periodStart: cost.periodStart ? format(new Date(cost.periodStart), 'yyyy-MM-dd') : null,
      periodEnd: cost.periodEnd ? format(new Date(cost.periodEnd), 'yyyy-MM-dd') : null,
      unitCostToWarehouse: cost.unitCostToWarehouse?.toString() || null,
      notes: cost.notes || null,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const data = {
      productId: formData.productId || null,
      periodStart: formData.periodStart ? new Date(formData.periodStart).toISOString() : new Date().toISOString(),
      periodEnd: formData.periodEnd ? new Date(formData.periodEnd).toISOString() : null,
      unitCostToWarehouse: formData.unitCostToWarehouse ? parseFloat(formData.unitCostToWarehouse) : 0,
      notes: formData.notes || null,
    };

    if (currentCost) {
      updateMutation.mutate({ id: currentCost.costId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSelectedProductName = () => {
    if (!formData.productId) return '';
    const product = products.find(p => p.productId === formData.productId);
    return product ? getProductDisplay(product) : '';
  };

  const columns = [
    {
      accessorKey: 'productName',
      header: t('productCosts.table.product'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.productName || t('productCosts.unknownProduct')}
            </span>
            {row.original.productBarcode && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('productCosts.barcodeLabel')}: {row.original.productBarcode}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'periodStart',
      header: t('productCosts.table.periodStart'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.periodStart ? format(new Date(row.original.periodStart), 'dd.MM.yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'periodEnd',
      header: t('productCosts.table.periodEnd'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.periodEnd
            ? format(new Date(row.original.periodEnd), 'dd.MM.yyyy')
            : t('productCosts.currentPeriod')}
        </span>
      ),
    },
    {
      accessorKey: 'unitCostToWarehouse',
      header: t('productCosts.table.unitCost'),
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.original.unitCostToWarehouse?.toFixed(2) || '0.00'} ₽
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: t('productCosts.table.notes'),
      cell: ({ row }) => (
        <span className="block max-w-xs text-sm truncate text-slate-500 dark:text-slate-400">
          {row.original.notes || '—'}
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
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { setCurrentCost(row.original); setDeleteDialogOpen(true); }}
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
        title={t('productCosts.title')}
        description={t('productCosts.description')}
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('productCosts.addPeriod')}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={enrichedProductCosts}
        isLoading={isLoading}
        searchPlaceholder={t('productCosts.searchPlaceholder')}
        emptyMessage={t('productCosts.emptyMessage')}
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
              {currentCost ? t('productCosts.editPeriod') : t('productCosts.addPeriod')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="productId">{t('productCosts.form.productRequired')}</Label>
              <Select
                value={formData.productId?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, productId: value || null })}
              >
                  <SelectTrigger>
                    <SelectValue placeholder={t('productCosts.form.selectProduct')}>
                      {getSelectedProductName()}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.productId} value={product.productId.toString()}>
                      {getProductDisplay(product)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">{t('productCosts.form.periodStartRequired')}</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={formData.periodStart || ''}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value || null })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">{t('productCosts.form.periodEnd')}</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={formData.periodEnd || ''}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCostToWarehouse">{t('productCosts.form.unitCostRequired')}</Label>
              <Input
                id="unitCostToWarehouse"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCostToWarehouse || ''}
                onChange={(e) => setFormData({ ...formData, unitCostToWarehouse: e.target.value || null })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('productCosts.form.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                placeholder={t('productCosts.form.notesPlaceholder')}
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
                {currentCost
                  ? (updateMutation.isPending ? t('common.saving') : t('common.save'))
                  : (createMutation.isPending ? t('common.creating') : t('common.create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('productCosts.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('productCosts.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCurrentCost(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentCost) {
                  deleteMutation.mutate(currentCost.costId);
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
