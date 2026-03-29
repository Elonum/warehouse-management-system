import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPageUrl } from '@/utils';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function ShipmentImportWildberries() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const shipmentIdFromUrl = searchParams.get('shipmentId') || '';

  const [shipmentId, setShipmentId] = useState(shipmentIdFromUrl);
  const [supplyIdRaw, setSupplyIdRaw] = useState('');
  const [matchBy, setMatchBy] = useState('barcode');
  const [isPreorderID, setIsPreorderID] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const id = searchParams.get('shipmentId');
    if (id) {
      setShipmentId(id);
    }
  }, [searchParams]);

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['mpShipments'],
    queryFn: async () => {
      const response = await api.mpShipments.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const supplyId = useMemo(() => {
    const n = parseInt(String(supplyIdRaw).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [supplyIdRaw]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      return api.mpShipments.wildberriesPreview(shipmentId, {
        supplyId,
        matchBy,
        isPreorderID,
      });
    },
    onSuccess: (data) => {
      setFormError('');
      setPreview(data);
    },
    onError: (err) => {
      setPreview(null);
      if (err instanceof ApiError) {
        setFormError(err.message);
        return;
      }
      setFormError(String(err?.message || err));
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      return api.mpShipments.wildberriesApply(shipmentId, {
        supplyId,
        matchBy,
        isPreorderID,
      });
    },
    onSuccess: async () => {
      setFormError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mpShipments'] }),
        queryClient.invalidateQueries({ queryKey: ['mpShipment', shipmentId] }),
        queryClient.invalidateQueries({ queryKey: ['mpShipmentItems', shipmentId] }),
      ]);
      previewMutation.mutate();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
        return;
      }
      setFormError(String(err?.message || err));
    },
  });

  const busy = previewMutation.isPending || applyMutation.isPending;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 gap-2 text-slate-600 dark:text-slate-400" asChild>
        <Link to={createPageUrl('Shipments')}>
          <ArrowLeft className="h-4 w-4" />
          {t('shipments.import.backToShipments')}
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{t('shipments.import.wildberriesPageTitle')}</span>
            <span
              className={cn(
                'rounded-full bg-gradient-to-r px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm',
                'from-purple-600 to-fuchsia-600',
              )}
            >
              {t('shipments.import.wildberries')}
            </span>
          </span>
        }
        description={t('shipments.import.wildberriesPageDescription')}
      />

      <div
        className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-100"
        role="status"
      >
        {t('shipments.import.wbServerTokenHint')}
      </div>

      {formError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('shipments.import.wbFieldShipment')}</Label>
              <Select
                value={shipmentId || undefined}
                onValueChange={(v) => {
                  setShipmentId(v);
                  setPreview(null);
                }}
                disabled={shipmentsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('shipments.import.wbShipmentPlaceholder')} />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {shipments.map((s) => (
                    <SelectItem key={s.shipmentId} value={s.shipmentId}>
                      {s.shipmentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wb-supply-id">{t('shipments.import.wbFieldSupplyId')}</Label>
              <Input
                id="wb-supply-id"
                inputMode="numeric"
                placeholder="38047690"
                value={supplyIdRaw}
                onChange={(e) => {
                  setSupplyIdRaw(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('shipments.import.wbFieldMatchBy')}</Label>
              <Select
                value={matchBy}
                onValueChange={(v) => {
                  setMatchBy(v);
                  setPreview(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom">
                  <SelectItem value="barcode">{t('shipments.import.wbMatchBarcode')}</SelectItem>
                  <SelectItem value="vendor_code">{t('shipments.import.wbMatchVendorCode')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={isPreorderID}
                  onChange={(e) => {
                    setIsPreorderID(e.target.checked);
                    setPreview(null);
                  }}
                />
                {t('shipments.import.wbIsPreorder')}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !shipmentId || supplyId <= 0}
              onClick={() => previewMutation.mutate()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('shipments.import.wbPreview')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !shipmentId || supplyId <= 0 || !preview}
              onClick={() => applyMutation.mutate()}
            >
              {t('shipments.import.wbApply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <div className="space-y-4">
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-2 pt-6 text-sm text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">{t('shipments.import.wbSupplySummary')}</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  {t('shipments.import.wbStatus')}: {preview.supply.statusId}
                </li>
                <li>
                  {t('shipments.import.wbWarehouse')}: {preview.supply.warehouseName || '—'}
                </li>
                <li>
                  {t('shipments.import.wbAcceptedTotal')}: {preview.supply.acceptedQuantity}
                </li>
              </ul>
            </CardContent>
          </Card>

          {preview.warnings?.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">{t('shipments.import.wbWarnings')}</p>
              <ul className="mt-2 list-inside list-disc">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="pt-6">
              <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
                {t('shipments.import.wbLinesTitle')}
              </h2>
              <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">{t('shipments.import.wbColArticle')}</th>
                      <th className="px-3 py-2">{t('shipments.import.wbColBarcode')}</th>
                      <th className="px-3 py-2 text-right">{t('shipments.import.wbColSent')}</th>
                      <th className="px-3 py-2 text-right">{t('shipments.import.wbColCurrentAccepted')}</th>
                      <th className="px-3 py-2 text-right">{t('shipments.import.wbColImportAccepted')}</th>
                      <th className="px-3 py-2">{t('shipments.import.wbColMatched')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {preview.lines.map((row) => (
                      <tr key={row.shipmentItemId} className="text-slate-800 dark:text-slate-200">
                        <td className="px-3 py-2 font-mono text-xs">{row.article}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.barcode}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.sentQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.currentAccepted}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{row.importAcceptedQty}</td>
                        <td className="px-3 py-2">{row.matched ? t('common.yes') : t('common.no')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {preview.unmatchedGoods?.length ? (
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
                  {t('shipments.import.wbUnmatchedTitle')}
                </h2>
                <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">nmID</th>
                        <th className="px-3 py-2">{t('shipments.import.wbColBarcode')}</th>
                        <th className="px-3 py-2">{t('shipments.import.wbColVendor')}</th>
                        <th className="px-3 py-2 text-right">{t('shipments.import.wbColAccepted')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preview.unmatchedGoods.map((row, idx) => (
                        <tr key={`${row.nmId}-${row.barcode}-${idx}`} className="text-slate-800 dark:text-slate-200">
                          <td className="px-3 py-2 font-mono text-xs">{row.nmId}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.barcode}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.vendorCode}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.acceptedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-slate-500 dark:text-slate-500">{t('shipments.import.wbDocFooter')}</p>
    </div>
  );
}
