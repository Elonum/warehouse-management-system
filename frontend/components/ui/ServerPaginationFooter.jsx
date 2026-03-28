import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

/**
 * Unified server-side table footer: page size, first/prev — page jump — next/last, range summary.
 */
export default function ServerPaginationFooter({
  page,
  totalPages,
  totalRows,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  from,
  to,
  pageRowCount,
  isLoading = false,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onPageSelect,
  onPageSizeChange,
  ariaLabel,
  className,
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    if (!editing) setDraft(String(page));
  }, [page, editing]);

  const showBar = pageRowCount > 0 || page > 1 || totalRows > 0;
  if (!showBar) return null;

  const label = ariaLabel ?? t('common.pagination.navLabel');
  const canJump = totalPages > 1;
  const canPrev = page > 1 && !isLoading;
  const canNext = page < totalPages && !isLoading;
  const canFirst = canPrev;
  const canLast = canNext;

  const commit = useCallback(() => {
    const raw = String(draft).trim();
    const n = parseInt(raw, 10);
    setEditing(false);
    if (!Number.isFinite(n) || n < 1) return;
    const target = Math.min(Math.max(1, n), totalPages);
    if (target !== page) onPageSelect(target);
  }, [draft, page, totalPages, onPageSelect]);

  const cancel = useCallback(() => {
    setDraft(String(page));
    setEditing(false);
  }, [page]);

  const onPageKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const rangeText =
    totalRows > 0 && pageRowCount > 0
      ? t('common.pagination.rangeOfTotal', { from, to, total: totalRows })
      : null;

  return (
    <nav
      className={cn(
        'border-t border-slate-200/90 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-3.5',
        className,
      )}
      aria-label={label}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          {typeof onPageSizeChange === 'function' && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline">
                {t('common.pagination.rowsPerPage')}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => onPageSizeChange(Number(v))}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9 w-28 border-slate-200 bg-white text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {t('common.pagination.pageSizeOption', { count: n })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            {onFirst && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
                disabled={!canFirst}
                aria-label={t('common.pagination.firstPage')}
                onClick={onFirst}
              >
                <ChevronsLeft className="h-4 w-4" aria-hidden />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
              disabled={!canPrev}
              aria-label={t('common.pagination.prevPage')}
              onClick={onPrev}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>

            <div className="flex min-h-9 items-center gap-1.5 px-2 text-sm tabular-nums">
              <span className="hidden text-slate-500 dark:text-slate-400 sm:inline">
                {t('common.pagination.pagePrefix')}
              </span>
              {editing ? (
                <Input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={t('common.pagination.inputLabel')}
                  className="mx-0.5 h-9 w-14 rounded-md border-slate-300 px-2 text-center text-sm font-semibold dark:border-slate-600"
                  value={draft}
                  onChange={(e) =>
                    setDraft(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  onKeyDown={onPageKeyDown}
                  onBlur={commit}
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <button
                  type="button"
                  disabled={!canJump || isLoading}
                  title={
                    canJump
                      ? t('common.pagination.clickToEdit')
                      : t('common.pagination.singlePage')
                  }
                  className="min-w-[2rem] rounded-md px-2 py-1 text-center text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200/80 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800/80 dark:disabled:hover:bg-transparent"
                  onClick={() => canJump && setEditing(true)}
                >
                  {page}
                </button>
              )}
              <span className="text-slate-500 dark:text-slate-400">
                {t('common.pagination.ofPages', { total: totalPages })}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
              disabled={!canNext}
              aria-label={t('common.pagination.nextPage')}
              onClick={onNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            {onLast && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
                disabled={!canLast}
                aria-label={t('common.pagination.lastPage')}
                onClick={onLast}
              >
                <ChevronsRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>

          {editing ? (
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              {t('common.pagination.editHint')}
            </p>
          ) : null}
        </div>

        <div className="flex min-h-[1.5rem] items-center justify-center lg:justify-end">
          {rangeText ? (
            <p className="text-center text-xs tabular-nums text-slate-500 dark:text-slate-400 lg:text-right">
              {rangeText}
            </p>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
