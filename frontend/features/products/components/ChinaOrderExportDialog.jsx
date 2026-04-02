import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, FileSpreadsheet } from 'lucide-react';
import { downloadChinaOrderExcel } from '@/features/products/utils/chinaOrderExcel';

function normalizeQty(raw) {
  const cleaned = String(raw ?? '').replace(/[^\d]/g, '');
  if (!cleaned) return '';
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return '';
  return String(Math.max(0, Math.min(num, 1_000_000)));
}

export default function ChinaOrderExportDialog({ t, open, onOpenChange, products }) {
  const [q, setQ] = useState('');
  const [meta, setMeta] = useState({
    supplier: '',
    orderNumber: '',
    orderDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Map productId -> qty string
  const [qtyById, setQtyById] = useState({});

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => {
      const hay = `${p.article || ''} ${p.barcode || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [products, q]);

  const selectedRows = useMemo(() => {
    return products
      .map((p) => {
        const qty = qtyById[p.productId];
        const qtyNum = qty ? Number(qty) : 0;
        if (!qtyNum || qtyNum <= 0) return null;
        return {
          productId: p.productId,
          article: p.article,
          barcode: p.barcode,
          unitWeight: p.unitWeight ?? null,
          purchasePrice: p.purchasePrice ?? null,
          qty: qtyNum,
        };
      })
      .filter(Boolean);
  }, [products, qtyById]);

  const totalSelected = selectedRows.length;

  const handleToggle = (productId, nextChecked) => {
    setQtyById((prev) => {
      const next = { ...prev };
      if (!nextChecked) {
        delete next[productId];
        return next;
      }
      if (!next[productId] || Number(next[productId]) <= 0) next[productId] = '1';
      return next;
    });
  };

  const handleQtyChange = (productId, value) => {
    const normalized = normalizeQty(value);
    setQtyById((prev) => ({ ...prev, [productId]: normalized }));
  };

  const handleExport = () => {
    downloadChinaOrderExcel({
      t,
      orderMeta: meta,
      rows: selectedRows,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQ('');
        }
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('products.orderExport.title')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="china-supplier">{t('products.orderExport.supplier')}</Label>
            <Input
              id="china-supplier"
              value={meta.supplier}
              onChange={(e) => setMeta((m) => ({ ...m, supplier: e.target.value }))}
              placeholder={t('products.orderExport.supplierPlaceholder')}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="china-orderNumber">{t('products.orderExport.orderNumber')}</Label>
            <Input
              id="china-orderNumber"
              value={meta.orderNumber}
              onChange={(e) => setMeta((m) => ({ ...m, orderNumber: e.target.value }))}
              placeholder={t('products.orderExport.orderNumberPlaceholder')}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="china-orderDate">{t('products.orderExport.orderDate')}</Label>
            <Input
              id="china-orderDate"
              type="date"
              value={meta.orderDate}
              onChange={(e) => setMeta((m) => ({ ...m, orderDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="china-notes">{t('products.orderExport.notes')}</Label>
          <Input
            id="china-notes"
            value={meta.notes}
            onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
            placeholder={t('products.orderExport.notesPlaceholder')}
            maxLength={255}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('products.orderExport.searchPlaceholder')}
              className="pl-9"
              maxLength={100}
            />
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {t('products.orderExport.selectedCount', { count: totalSelected })}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="max-h-[45vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left">{t('products.orderExport.table.article')}</th>
                  <th className="px-4 py-3 text-left">{t('products.orderExport.table.barcode')}</th>
                  <th className="px-4 py-3 text-right">{t('products.orderExport.table.purchasePrice')}</th>
                  <th className="px-4 py-3 text-right">{t('products.orderExport.table.qty')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => {
                  const qty = qtyById[p.productId] ?? '';
                  const checked = Number(qty) > 0;
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={checked}
                          onChange={(e) => handleToggle(p.productId, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {p.article}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300">
                        {p.barcode}
                      </td>
                      <td className="px-4 py-3 align-middle text-right text-slate-600 dark:text-slate-300">
                        {p.purchasePrice != null ? `¥${Number(p.purchasePrice).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="h-8 w-24 text-right"
                          value={qty}
                          onChange={(e) => handleQtyChange(p.productId, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={totalSelected === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('products.orderExport.export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

