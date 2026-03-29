import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/api';
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
import { useI18n } from '@/lib/i18n';
import { shipmentImportErrorMessage } from '@/features/mpShipments/import/shipmentImportErrorMessage';

const DEFAULT_STATUS_IDS = [4, 5];

/**
 * Loads WB supplies via backend proxy and lets the user pick one for import (sets supply ID + preorder flag).
 */
export function WildberriesSuppliesPicker({ onPick, disabled: parentDisabled }) {
  const { t } = useI18n();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTill, setDateTill] = useState('');
  const [dateType, setDateType] = useState('factDate');
  const [listError, setListError] = useState('');

  const listMutation = useMutation({
    mutationFn: async () => {
      const dates =
        dateFrom && dateTill
          ? [{ from: dateFrom, till: dateTill, type: dateType }]
          : [];
      return api.integrations.wildberries.listSupplies({
        limit: 100,
        offset: 0,
        statusIds: DEFAULT_STATUS_IDS,
        dates,
      });
    },
    onSuccess: () => setListError(''),
    onError: (err) => setListError(shipmentImportErrorMessage(err, t)),
  });

  const handleLoadList = () => {
    if ((dateFrom && !dateTill) || (!dateFrom && dateTill)) {
      setListError(t('shipments.import.errors.dateRangeIncomplete'));
      return;
    }
    if (dateFrom && dateTill && dateFrom > dateTill) {
      setListError(t('shipments.import.errors.dateRangeOrder'));
      return;
    }
    setListError('');
    listMutation.mutate();
  };

  const items = listMutation.data?.items ?? [];
  const busy = listMutation.isPending || parentDisabled;

  return (
    <Card className="dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="space-y-4 pt-6">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('shipments.import.wbListTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('shipments.import.wbListHint')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="wb-list-from">{t('shipments.import.wbDateFrom')}</Label>
            <Input id="wb-list-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wb-list-till">{t('shipments.import.wbDateTill')}</Label>
            <Input id="wb-list-till" type="date" value={dateTill} onChange={(e) => setDateTill(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label>{t('shipments.import.wbDateType')}</Label>
            <Select value={dateType} onValueChange={setDateType} disabled={busy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom">
                <SelectItem value="factDate">{t('shipments.import.wbDateTypeFact')}</SelectItem>
                <SelectItem value="supplyDate">{t('shipments.import.wbDateTypeSupply')}</SelectItem>
                <SelectItem value="createDate">{t('shipments.import.wbDateTypeCreate')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="button" variant="outline" disabled={busy} onClick={handleLoadList} className="gap-2">
          {listMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('shipments.import.wbListLoad')}
        </Button>

        {listError ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {listError}
          </div>
        ) : null}

        {listMutation.isSuccess && items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('shipments.import.wbListEmpty')}</p>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">{t('shipments.import.wbListColImportId')}</th>
                  <th className="px-3 py-2">{t('shipments.import.wbListColKind')}</th>
                  <th className="px-3 py-2 text-right">{t('shipments.import.wbStatus')}</th>
                  <th className="px-3 py-2">{t('shipments.import.wbListColSupplyDate')}</th>
                  <th className="px-3 py-2">{t('shipments.import.wbListColFactDate')}</th>
                  <th className="px-3 py-2 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((row, idx) => (
                  <tr key={`${row.importId}-${row.importAsPreorder ? 'p' : 's'}-${idx}`} className="text-slate-800 dark:text-slate-200">
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{row.importId}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.importAsPreorder ? t('shipments.import.wbListKindPreorder') : t('shipments.import.wbListKindSupply')}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.statusId}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {row.supplyDate || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.factDate || '—'}</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onPick({ importId: row.importId, importAsPreorder: row.importAsPreorder })}
                      >
                        {t('shipments.import.wbListUse')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
