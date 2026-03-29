import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileUp, Table2, Link2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Wireframe layout for marketplace shipment import (WB / Ozon). No upload logic yet.
 */
export function MarketplaceImportMockLayout({
  title,
  description,
  badge,
  accentClassName = 'from-indigo-600 to-violet-600',
}) {
  const { t } = useI18n();

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
            <span>{title}</span>
            {badge ? (
              <span
                className={cn(
                  'rounded-full bg-gradient-to-r px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm',
                  accentClassName,
                )}
              >
                {badge}
              </span>
            ) : null}
          </span>
        }
        description={description}
      />

      <div
        className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="status"
      >
        {t('shipments.import.mockNotice')}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <FileUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              {t('shipments.import.sectionUpload')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('shipments.import.sectionUploadHint')}
            </p>
            <Button type="button" variant="outline" className="mt-4 w-full sm:w-auto" disabled>
              {t('shipments.import.chooseFile')}
            </Button>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Table2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              {t('shipments.import.sectionPreview')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('shipments.import.sectionPreviewHint')}
            </p>
            <div className="mt-4 rounded-md border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              ——
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Link2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              {t('shipments.import.sectionMapping')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('shipments.import.sectionMappingHint')}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-500">{t('shipments.import.integrationsNote')}</p>
    </div>
  );
}
