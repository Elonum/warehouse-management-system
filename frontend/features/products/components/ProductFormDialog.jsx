import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductImageUpload from '@/components/ProductImageUpload';

function ProductFormDialog({
  t,
  open,
  onOpenChange,
  formData,
  error,
  currentProduct,
  onChangeField,
  onSubmit,
  isSubmitting,
  onResetForm,
  canWriteProducts = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          onResetForm();
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
                onChange={(e) => onChangeField('article', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">{t('products.form.barcode')} *</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => onChangeField('barcode', e.target.value)}
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
                onChange={(e) => onChangeField('unitWeight', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">{t('products.form.reorderPoint')}</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint ?? 0}
                onChange={(e) => onChangeField('reorderPoint', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="purchasePrice">{t('products.form.purchasePrice')} (¥)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice || ''}
                onChange={(e) => onChangeField('purchasePrice', e.target.value || null)}
                placeholder={t('products.form.purchasePricePlaceholder')}
              />
            </div>
          </div>

          <ProductImageUpload
            images={formData.images || []}
            onImagesChange={(newImages) => {
              const imagePaths = newImages.map((img) =>
                typeof img === 'string' ? img : img.filePath
              );
              onChangeField('imagePaths', imagePaths);
              onChangeField('images', newImages);
            }}
            productId={currentProduct?.productId || null}
            maxImages={10}
            allowed={canWriteProducts}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onResetForm();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {currentProduct ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductFormDialog;

