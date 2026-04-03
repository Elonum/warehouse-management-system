import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, FileSpreadsheet, Image as ImageIcon, ImageOff } from 'lucide-react';
import { downloadChinaOrderExcel } from '@/features/products/utils/chinaOrderExcel';
import { api } from '@/api';

function normalizeQty(raw) {
  const cleaned = String(raw ?? '').replace(/[^\d]/g, '');
  if (!cleaned) return '';
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return '';
  return String(Math.max(0, Math.min(num, 1_000_000)));
}

function normalizePositiveNumber(raw, max = 1_000_000) {
  const source = String(raw ?? '').replace(',', '.').trim();
  if (!source) return '';
  // Allow only positive decimal format (digits + optional one dot)
  if (!/^\d*\.?\d*$/.test(source)) return '';
  if (source === '.' || source === '0.') return source;
  const num = Number(source);
  if (!Number.isFinite(num) || num < 0) return '';
  const clamped = Math.max(0, Math.min(num, max));
  return String(clamped);
}

function normalizeUrl(raw) {
  const v = String(raw ?? '').trim().slice(0, 500);
  if (!v) return '';
  // keep only safe schemes
  if (/^https?:\/\//i.test(v)) return v;
  return v; // allow user to paste without scheme; Excel will keep as text
}

function firstImageUrl(p) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const images = Array.isArray(p?.images) ? p.images : [];
  return images
    .map((img) => {
      const filePath = img?.filePath ? String(img.filePath).replace(/\\/g, '/').replace(/^\.\/+/, '') : '';
      if (filePath) {
        return `${base}/files?path=${encodeURIComponent(filePath)}`;
      }
      if (img?.imageUrl) {
        return String(img.imageUrl);
      }
      return '';
    })
    .filter(Boolean);
}

export default function ChinaOrderExportDialog({ t, open, onOpenChange, products }) {
  const [q, setQ] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Map productId -> qty string
  const [qtyById, setQtyById] = useState({});
  const [linkById, setLinkById] = useState({});
  const [packById, setPackById] = useState({});
  const [readyById, setReadyById] = useState({});
  const [factoryIdById, setFactoryIdById] = useState({});
  const [weightById, setWeightById] = useState({});
  const [priceById, setPriceById] = useState({});

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => {
      const hay = `${p.article || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [products, q]);

  const selectedRows = useMemo(() => {
    return products
      .map((p) => {
        const qty = qtyById[p.productId];
        const qtyNum = qty ? Number(qty) : 0;
        if (!qtyNum || qtyNum <= 0) return null;
        const factoryId = String(factoryIdById[p.productId] ?? '').trim();
        const unitWeight = String(weightById[p.productId] ?? '').trim();
        const price = String(priceById[p.productId] ?? '').trim();
        return {
          productId: p.productId,
          factoryId,
          article: p.article,
          unitWeight: unitWeight !== '' ? Number(unitWeight) : (p.unitWeight ?? null),
          purchasePrice: price !== '' ? Number(price) : (p.purchasePrice ?? null),
          qty: qtyNum,
          photoUrls: firstImageUrl(p),
          productLink: normalizeUrl(linkById[p.productId]),
          packagingComment: String(packById[p.productId] ?? '').slice(0, 255),
          readyTime: String(readyById[p.productId] ?? '').slice(0, 100),
        };
      })
      .filter(Boolean);
  }, [products, qtyById, linkById, packById, readyById, factoryIdById, weightById, priceById]);

  const totalSelected = selectedRows.length;
  const totals = useMemo(() => {
    return selectedRows.reduce(
      (acc, row) => {
        const qty = Number(row.qty) || 0;
        const unitWeight = Number(row.unitWeight) || 0;
        const purchasePrice = Number(row.purchasePrice) || 0;
        return {
          qty: acc.qty + qty,
          totalWeightKg: acc.totalWeightKg + (qty * unitWeight) / 1000,
          totalPriceYuan: acc.totalPriceYuan + qty * purchasePrice,
        };
      },
      { qty: 0, totalWeightKg: 0, totalPriceYuan: 0 },
    );
  }, [selectedRows]);

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

  const handleExport = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultFileName = `china-order-${today}`;
    if (selectedRows.length === 0 || isExporting) return;

    setIsExporting(true);
    try {
      // Reliability: re-fetch selected products to get current full image set.
      const selectedIds = selectedRows.map((r) => r.productId);
      const productMap = new Map(products.map((p) => [p.productId, p]));

      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const full = await api.products.get(id);
            if (full?.productId) productMap.set(id, full);
          } catch {
            // Keep fallback product from list when detail fetch fails.
          }
        }),
      );

      const enrichedRows = selectedRows.map((row) => ({
        ...row,
        photoUrls: firstImageUrl(productMap.get(row.productId)),
      }));

      await downloadChinaOrderExcel({
        fileName: excelFileName.trim() || defaultFileName,
        rows: enrichedRows,
      });
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      className="mx-auto w-[80vw] max-w-[1200px]"
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQ('');
        }
      }}
    >
      <DialogContent className="mx-auto w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('products.orderExport.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="china-excel-name">{t('products.orderExport.fileName')}</Label>
          <Input
            id="china-excel-name"
            value={excelFileName}
            onChange={(e) => setExcelFileName(e.target.value)}
            placeholder={`china-order-${new Date().toISOString().slice(0, 10)}`}
            maxLength={120}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('products.orderExport.searchPlaceholder')}
              className="pl-10"
              maxLength={100}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 py-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
              {t('products.orderExport.selectedCount', { count: totalSelected })}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
              {t('products.orderExport.totals.qty')}: <b>{totals.qty.toLocaleString()}</b>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
              {t('products.orderExport.totals.weightKg')}: <b>{totals.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
              {t('products.orderExport.totals.totalPriceYuan')}: <b>{totals.totalPriceYuan.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="max-h-[45vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-3 text-center w-10"></th>
                  <th className="px-4 py-3 text-left">SKUID</th>
                  <th className="px-4 py-3 text-left">factory ID</th>
                  <th className="px-4 py-3 text-left">Product link</th>
                  <th className="px-4 py-3 text-left">Comment on packaging</th>
                  <th className="px-4 py-3 text-left">Ready time</th>
                  <th className="px-4 py-3 text-right">Product weight (g)</th>
                  <th className="px-4 py-3 text-right">Price in yuan</th>
                  <th className="px-3 py-3 text-left">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => {
                  const qty = qtyById[p.productId] ?? '';
                  const checked = Number(qty) > 0;
                  const photoUrls = firstImageUrl(p);
                  const hasPhotos = Array.isArray(photoUrls) && photoUrls.length > 0;
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-3 align-middle text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={checked}
                          onChange={(e) => handleToggle(p.productId, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          {hasPhotos ? (
                            <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          )}
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {p.article}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Input
                          className="h-8 w-28"
                          value={factoryIdById[p.productId] ?? ''}
                          onChange={(e) =>
                            setFactoryIdById((prev) => ({ ...prev, [p.productId]: e.target.value.slice(0, 64) }))
                          }
                          maxLength={64}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Input
                          className="h-8 w-56"
                          value={linkById[p.productId] ?? ''}
                          onChange={(e) =>
                            setLinkById((prev) => ({ ...prev, [p.productId]: e.target.value }))
                          }
                          placeholder="https://…"
                          maxLength={500}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Input
                          className="h-8 w-44"
                          value={packById[p.productId] ?? ''}
                          onChange={(e) =>
                            setPackById((prev) => ({ ...prev, [p.productId]: e.target.value }))
                          }
                          placeholder="Comment"
                          maxLength={255}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Input
                          className="h-8 w-28"
                          value={readyById[p.productId] ?? ''}
                          onChange={(e) =>
                            setReadyById((prev) => ({ ...prev, [p.productId]: e.target.value }))
                          }
                          maxLength={100}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle text-right font-medium text-slate-600 dark:text-slate-300">
                        <Input
                          inputMode="decimal"
                          className="h-8 w-20 text-right"
                          value={weightById[p.productId] ?? (p.unitWeight ?? '')}
                          onChange={(e) =>
                            setWeightById((prev) => ({
                              ...prev,
                              [p.productId]: normalizePositiveNumber(e.target.value, 100000),
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 align-middle text-right font-medium text-slate-600 dark:text-slate-300">
                        <Input
                          inputMode="decimal"
                          className="h-8 w-24 text-right"
                          value={priceById[p.productId] ?? (p.purchasePrice ?? '')}
                          onChange={(e) =>
                            setPriceById((prev) => ({
                              ...prev,
                              [p.productId]: normalizePositiveNumber(e.target.value, 1000000),
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="h-8 w-14 text-right"
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
          <Button onClick={handleExport} disabled={totalSelected === 0 || isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : t('products.orderExport.export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

