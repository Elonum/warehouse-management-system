import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function ProductCostFormDialog({
  t,
  open,
  onOpenChange,
  isEdit,
  formData,
  onChangeField,
  products,
  getProductLabel,
  error,
  isSubmitting,
  onSubmit,
  onCancel,
}) {
  const selectedLabel = formData.productId
    ? getProductLabel(formData.productId)
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('productCosts.editPeriod') : t('productCosts.addPeriod')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="productId">{t('productCosts.form.productRequired')}</Label>
            <Select
              value={formData.productId?.toString() || ''}
              onValueChange={(value) => onChangeField('productId', value || null)}
              disabled={isEdit}
            >
              <SelectTrigger id="productId">
                <SelectValue placeholder={t('productCosts.form.selectProduct')}>
                  {selectedLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.productId} value={String(product.productId)}>
                    {getProductLabel(product)}
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
                onChange={(e) => onChangeField('periodStart', e.target.value || null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">{t('productCosts.form.periodEnd')}</Label>
              <Input
                id="periodEnd"
                type="date"
                value={formData.periodEnd || ''}
                onChange={(e) => onChangeField('periodEnd', e.target.value || null)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('productCosts.form.periodEndHint')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCostToWarehouse">{t('productCosts.form.unitCostRequired')}</Label>
            <Input
              id="unitCostToWarehouse"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitCostToWarehouse ?? ''}
              onChange={(e) => onChangeField('unitCostToWarehouse', e.target.value)}
              required
            />
          </div>

          {!isEdit ? (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <input
                id="closePrevious"
                type="checkbox"
                className="mt-1"
                checked={formData.closePrevious !== false}
                onChange={(e) => onChangeField('closePrevious', e.target.checked)}
              />
              <div>
                <Label htmlFor="closePrevious" className="cursor-pointer font-normal">
                  {t('productCosts.form.closePrevious')}
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('productCosts.form.closePreviousHint')}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">{t('productCosts.form.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => onChangeField('notes', e.target.value || null)}
              rows={3}
              placeholder={t('productCosts.form.notesPlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit
                ? isSubmitting
                  ? t('common.saving')
                  : t('common.save')
                : isSubmitting
                  ? t('common.creating')
                  : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
