import React from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry, className }) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-8 text-sm text-red-600 dark:text-red-400',
        className,
      )}
    >
      <div>{message || t('common.error') || 'Ошибка загрузки данных'}</div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry') || 'Повторить попытку'}
        </Button>
      )}
    </div>
  );
}

