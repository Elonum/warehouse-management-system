import React from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function EmptyState({ message, className }) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400',
        className,
      )}
    >
      {message || t('common.noData')}
    </div>
  );
}

