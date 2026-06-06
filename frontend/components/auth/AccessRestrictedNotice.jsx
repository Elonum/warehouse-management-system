import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

export function AccessRestrictedNotice({ title, body, roleName, children }) {
  const { t } = useI18n();

  return (
    <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <div className="max-w-lg space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{body}</p>
          {roleName ? (
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {t('rbac.currentRole', { role: roleName })}
            </p>
          ) : null}
          <p className="text-sm text-slate-500 dark:text-slate-500">
            {t('rbac.contactAdmin')}
          </p>
        </div>
        {children ? <div className="flex flex-wrap justify-center gap-2">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
