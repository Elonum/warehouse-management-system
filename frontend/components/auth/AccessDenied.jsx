import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { createPageUrl } from '@/utils';

export function AccessDenied({ navKey, roleName }) {
  const { t } = useI18n();
  const moduleName = navKey ? t(`nav.${navKey}`) : t('rbac.moduleFallback');

  return (
    <div className="space-y-6">
      <PageHeader title={moduleName} description={t('rbac.pageDescription')} />
      <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </div>
          <div className="max-w-lg space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('rbac.accessDeniedTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('rbac.accessDeniedBody', { module: moduleName })}
            </p>
            {roleName ? (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {t('rbac.currentRole', { role: roleName })}
              </p>
            ) : null}
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {t('rbac.contactAdmin')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={createPageUrl('Dashboard')}>{t('rbac.backToDashboard')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
