import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { GuardedButton } from '@/components/auth/PermissionControls';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '@/components/ui/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ProductsTable from './components/ProductsTable';
import ProductFormDialog from './components/ProductFormDialog';
import ChinaOrderExportDialog from './components/ChinaOrderExportDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const emptyProduct = {
  article: '',
  barcode: '',
  unitWeight: 0,
  reorderPoint: 0,
  purchasePrice: null,
  imagePaths: [],
  images: [],
};

function ProductsPageContainer() {
  const { t } = useI18n();
  const { canWriteProducts } = usePermissions();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerProduct, setImageViewerProduct] = useState(null);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageIndices, setImageIndices] = useState({});
  const [chinaOrderDialogOpen, setChinaOrderDialogOpen] = useState(false);

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];

  const resetForm = () => {
    setFormData(emptyProduct);
    setCurrentProduct(null);
    setError('');
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.products.create(data),
    onSuccess: async (response) => {
      if (response?.productId) {
        try {
          const fullProduct = await api.products.get(response.productId);
          if (dialogOpen) {
            setFormData((prev) => ({
              ...prev,
              images: fullProduct.images || [],
              imagePaths: fullProduct.images?.map((img) => img.filePath) || [],
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
      if (response?.productId || currentProduct?.productId) {
        const productId = response?.productId || currentProduct?.productId;
        try {
          const fullProduct = await api.products.get(productId);
          if (dialogOpen) {
            setFormData((prev) => ({
              ...prev,
              images: fullProduct.images || [],
              imagePaths: fullProduct.images?.map((img) => img.filePath) || [],
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

      setDeleteError('');
      queryClient.setQueryData(['products'], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((product) => product.productId !== deletedId);
      });

      return { previousData };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
      setDeleteError('');
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await refetch();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['products'], context.previousData);
      }

      if (err instanceof ApiError) {
        if (err.code === 'PRODUCT_IN_USE') {
          setDeleteError(t('products.errors.deleteInUse'));
        }
        // Always show i18n errors to the user.
        // Keep backend message for debugging only.
        if (err.code !== 'PRODUCT_IN_USE') {
          // eslint-disable-next-line no-console
          console.warn('Delete product failed:', { code: err.code, status: err.status, message: err.message });
          setDeleteError(t('products.errors.deleteFailed'));
        }
        return;
      }

      setDeleteError(t('products.errors.deleteFailed'));
    },
  });

  const handleEdit = async (product) => {
    setCurrentProduct(product);

    let productImages = [];
    if (product.productId) {
      try {
        const fullProduct = await api.products.get(product.productId);
        productImages = fullProduct.images || [];
      } catch (err) {
        console.error('Failed to load product images:', err);
        productImages = product.images || [];
      }
    } else {
      productImages = product.images || [];
    }

    setFormData({
      article: product.article || '',
      barcode: product.barcode || '',
      unitWeight: product.unitWeight || 0,
      reorderPoint: product.reorderPoint || 0,
      purchasePrice: product.purchasePrice || null,
      imagePaths: productImages.map((img) => img.filePath) || [],
      images: productImages,
    });
    setDialogOpen(true);
  };

  const handleDelete = (product) => {
    setCurrentProduct(product);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const validateAndBuildPayload = () => {
    const article = formData.article.trim();
    const barcode = formData.barcode.trim();
    const unitWeight = parseInt(formData.unitWeight, 10) || 0;
    const reorderPoint = parseInt(formData.reorderPoint, 10) || 0;

    if (!article) {
      setError(t('products.form.articleRequired'));
      return null;
    }

    if (article.length < 2 || article.length > 100) {
      setError(t('products.form.articleLength'));
      return null;
    }

    if (!barcode) {
      setError(t('products.form.barcodeRequired'));
      return null;
    }

    if (barcode.length < 2 || barcode.length > 50) {
      setError(t('products.form.barcodeLength'));
      return null;
    }

    if (unitWeight < 0) {
      setError(t('products.form.weightInvalid'));
      return null;
    }
    if (reorderPoint < 0) {
      setError(t('products.form.reorderPointInvalid'));
      return null;
    }

    const purchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;

    if (purchasePrice !== null && (Number.isNaN(purchasePrice) || purchasePrice < 0)) {
      setError(t('products.form.purchasePriceInvalid'));
      return null;
    }

    const allImagePaths = formData.imagePaths || [];
    const imagesFromObjects = (formData.images || [])
      .filter((img) => typeof img === 'object' && img.filePath)
      .map((img) => img.filePath);

    const mergedImagePaths = [...new Set([...allImagePaths, ...imagesFromObjects])];

    return {
      article,
      barcode,
      unitWeight,
      reorderPoint,
      purchasePrice,
      imagePaths: mergedImagePaths,
    };
  };

  const handleSubmit = () => {
    setError('');
    const payload = validateAndBuildPayload();
    if (!payload) return;

    if (currentProduct) {
      updateMutation.mutate({ id: currentProduct.productId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChangeField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenImageViewer = (product, index) => {
    setImageViewerProduct(product);
    setImageViewerIndex(index);
    setImageViewerOpen(true);
  };

  const handleChangeImageIndex = (productId, newIndex) => {
    setImageIndices((prev) => ({ ...prev, [productId]: newIndex }));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title={t('products.title')} description={t('products.description')}>
        <div className="flex flex-wrap gap-2">
          <GuardedButton
            allowed={canWriteProducts}
            variant="outline"
            onClick={() => {
              setChinaOrderDialogOpen(true);
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {t('products.orderExport.open')}
          </GuardedButton>
          <GuardedButton
            allowed={canWriteProducts}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('products.addProduct')}
          </GuardedButton>
        </div>
      </PageHeader>

      <ProductsTable
        t={t}
        products={products}
        isLoading={isLoading}
        imageIndices={imageIndices}
        onChangeImageIndex={handleChangeImageIndex}
        onOpenImageViewer={handleOpenImageViewer}
        canWriteProducts={canWriteProducts}
        onEditProduct={handleEdit}
        onRequestDelete={handleDelete}
      />

      <ProductFormDialog
        t={t}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formData={formData}
        error={error}
        currentProduct={currentProduct}
        onChangeField={handleChangeField}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onResetForm={resetForm}
        canWriteProducts={canWriteProducts}
      />

      <ChinaOrderExportDialog
        t={t}
        open={chinaOrderDialogOpen}
        onOpenChange={setChinaOrderDialogOpen}
        products={products}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          setDeleteDialogOpen(nextOpen);
          if (!nextOpen) setDeleteError('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.deleteConfirm.description', { article: currentProduct?.article || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteError('');
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentProduct?.productId) {
                  deleteMutation.mutate(currentProduct.productId);
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

      {imageViewerProduct && (
        <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
          <DialogContent
            className="max-w-6xl max-h-[95vh] p-0 bg-black/95 border-0"
            onClick={(e) => e.stopPropagation()}
          >
            {imageViewerProduct.images &&
              imageViewerProduct.images.length > 0 &&
              imageViewerIndex >= 0 &&
              imageViewerIndex < imageViewerProduct.images.length && (
                <div className="relative w-full h-[90vh] flex items-center justify-center">
                  {imageViewerProduct.images.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageViewerIndex((prev) =>
                          prev > 0 ? prev - 1 : imageViewerProduct.images.length - 1
                        );
                      }}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}

                  <img
                    src={
                      imageViewerProduct.images[imageViewerIndex]?.imageUrl ||
                      `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/files?path=${encodeURIComponent(
                        imageViewerProduct.images[imageViewerIndex]?.filePath || ''
                      )}`
                    }
                    alt={`${imageViewerProduct.article} - Image ${imageViewerIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {imageViewerProduct.images.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageViewerIndex((prev) =>
                          prev < imageViewerProduct.images.length - 1 ? prev + 1 : 0
                        );
                      }}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageViewerOpen(false);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>

                  {imageViewerProduct.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {imageViewerIndex + 1} / {imageViewerProduct.images.length}
                    </div>
                  )}
                </div>
              )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ProductsPageContainer;

