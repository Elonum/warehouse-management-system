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
import ProductImageUpload from '@/components/ProductImageUpload';
import { Image as ImageIcon } from 'lucide-react';

const emptyProduct = {
  article: '',
  barcode: '',
  unitWeight: 0,
  unitCost: null,
  purchasePrice: null,
  processingPrice: null,
  imagePaths: [],
  images: [],
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
    onSuccess: async (response) => {
      // After creation, reload product to get images with IDs from DB
      if (response?.productId) {
        try {
          const fullProduct = await api.products.get(response.productId);
          // Update form data with images from DB if dialog is still open
          if (dialogOpen) {
            setFormData(prev => ({
              ...prev,
              images: fullProduct.images || [],
              imagePaths: fullProduct.images?.map(img => img.filePath) || [],
            }));
          }
        } catch (err) {
          console.error('Failed to reload product images:', err);
        }
      }
      setDialogOpen(false);
      resetForm();
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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
    onSuccess: async (response) => {
      // After update, reload product to get updated images from DB
      if (response?.productId || currentProduct?.productId) {
        const productId = response?.productId || currentProduct?.productId;
        try {
          const fullProduct = await api.products.get(productId);
          // Update form data with images from DB if dialog is still open
          if (dialogOpen) {
            setFormData(prev => ({
              ...prev,
              images: fullProduct.images || [],
              imagePaths: fullProduct.images?.map(img => img.filePath) || [],
            }));
          }
        } catch (err) {
          console.error('Failed to reload product images:', err);
        }
      }
      setDialogOpen(false);
      resetForm();
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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

  const handleEdit = async (product) => {
    setCurrentProduct(product);
    
    // Load full product data with images if not already loaded
    let productImages = product.images || [];
    if (product.productId && (!product.images || product.images.length === 0)) {
      try {
        const fullProduct = await api.products.get(product.productId);
        productImages = fullProduct.images || [];
      } catch (err) {
        console.error('Failed to load product images:', err);
      }
    }

    setFormData({
      article: product.article || '',
      barcode: product.barcode || '',
      unitWeight: product.unitWeight || 0,
      unitCost: product.unitCost || null,
      purchasePrice: product.purchasePrice || null,
      processingPrice: product.processingPrice || null,
      imagePaths: productImages.map(img => img.filePath) || [],
      images: productImages, // Store full image objects for editing
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

    // Validation
    const article = formData.article.trim();
    const barcode = formData.barcode.trim();
    const unitWeight = parseInt(formData.unitWeight) || 0;

    if (!article) {
      setError(t('products.form.articleRequired'));
      return;
    }

    if (article.length < 2 || article.length > 100) {
      setError(t('products.form.articleLength'));
      return;
    }

    if (!barcode) {
      setError(t('products.form.barcodeRequired'));
      return;
    }

    if (barcode.length < 2 || barcode.length > 50) {
      setError(t('products.form.barcodeLength'));
      return;
    }

    if (unitWeight < 0) {
      setError(t('products.form.weightInvalid'));
      return;
    }

    // Parse prices with validation
    const unitCost = formData.unitCost ? parseFloat(formData.unitCost) : null;
    const purchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    const processingPrice = formData.processingPrice ? parseFloat(formData.processingPrice) : null;

    if (unitCost !== null && (isNaN(unitCost) || unitCost < 0)) {
      setError(t('products.form.priceInvalid'));
      return;
    }

    if (purchasePrice !== null && (isNaN(purchasePrice) || purchasePrice < 0)) {
      setError(t('products.form.purchasePriceInvalid'));
      return;
    }

    if (processingPrice !== null && (isNaN(processingPrice) || processingPrice < 0)) {
      setError(t('products.form.processingPriceInvalid'));
      return;
    }

    const data = {
      article,
      barcode,
      unitWeight,
      unitCost,
      purchasePrice,
      processingPrice,
      imagePaths: formData.imagePaths || [],
    };

    if (currentProduct) {
      updateMutation.mutate({ id: currentProduct.productId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      accessorKey: 'image',
      header: '',
      sortable: false,
      cell: ({ row }) => {
        const mainImage = row.original.images?.[0];
        if (!mainImage) {
          return (
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800">
              <ImageIcon className="w-5 h-5 text-slate-400" />
            </div>
          );
        }
        const imageUrl = mainImage.imageUrl || `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/files?path=${encodeURIComponent(mainImage.filePath)}`;
        return (
          <div className="flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <img
              src={imageUrl}
              alt={row.original.article}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                }
              }}
            />
          </div>
        );
      },
    },
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
      accessorKey: 'purchasePrice',
      header: t('products.table.purchasePrice'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.purchasePrice ? `¥${row.original.purchasePrice.toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'processingPrice',
      header: t('products.table.processingPrice'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.processingPrice ? `₽${row.original.processingPrice.toFixed(2)}` : '—'}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">{t('products.form.purchasePrice')} (¥)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value || null })}
                  placeholder={t('products.form.purchasePricePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="processingPrice">{t('products.form.processingPrice')}</Label>
                <Input
                  id="processingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.processingPrice || ''}
                  onChange={(e) => setFormData({ ...formData, processingPrice: e.target.value || null })}
                  placeholder={t('products.form.processingPricePlaceholder')}
                />
              </div>
            </div>

            {/* Image Upload Component */}
            <ProductImageUpload
              images={formData.images || []}
              onImagesChange={(newImages) => {
                // Handle both string paths and image objects
                const imagePaths = newImages.map(img => 
                  typeof img === 'string' ? img : img.filePath
                );
                setFormData({ 
                  ...formData, 
                  imagePaths,
                  images: newImages // Keep all images (both objects and strings) for display
                });
              }}
              productId={currentProduct?.productId || null}
            />

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
