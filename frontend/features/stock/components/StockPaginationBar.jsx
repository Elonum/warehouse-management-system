import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Server-side pagination with total count, arrow nav, and inline page jump (click page number).
 */
function StockPaginationBar({
  t,
  page,
  totalPages,
  totalRows,
  limit,
  pageRowCount,
  from,
  to,
  isLoading,
  onPrev,
  onNext,
  onPageSelect,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    if (!editing) setDraft(String(page));
  }, [page, editing]);

  const canJump = totalPages > 1;
  const canPrev = page > 1 && !isLoading;
  const canNext = page < totalPages && !isLoading;

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

  const showBar = pageRowCount > 0 || page > 1;
  if (!showBar) return null;

  return (
    <nav
      className="flex justify-center border-t border-slate-200/90 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60"
      aria-label={t('stock.pagination.navLabel')}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
            disabled={!canPrev}
            aria-label={t('stock.pagination.prev')}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>

          <div className="flex min-h-[2.25rem] items-center gap-1.5 px-2 text-sm tabular-nums">
            <span className="hidden text-slate-500 dark:text-slate-400 sm:inline">
              {t('stock.pagination.pagePrefix')}
            </span>
            {editing ? (
              <Input
                autoFocus
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={t('stock.pagination.inputLabel')}
                className="mx-0.5 h-9 w-14 rounded-md border-slate-300 px-2 text-center text-sm font-semibold dark:border-slate-600"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={onPageKeyDown}
                onBlur={commit}
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <button
                type="button"
                disabled={!canJump || isLoading}
                title={
                  canJump ? t('stock.pagination.clickToEdit') : t('stock.pagination.singlePage')
                }
                className="min-w-[2rem] rounded-md px-2 py-1 text-center text-base font-semibold text-slate-900 transition-colors hover:bg-slate-200/80 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800/80 dark:disabled:hover:bg-transparent"
                onClick={() => canJump && setEditing(true)}
              >
                {page}
              </button>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              {t('stock.pagination.ofPages', { total: totalPages })}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-slate-200 shadow-sm dark:border-slate-700"
            disabled={!canNext}
            aria-label={t('stock.pagination.next')}
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {totalRows > 0 && pageRowCount > 0 ? (
          <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {t('stock.pagination.rangeOfTotal', { from, to, total: totalRows })}
          </p>
        ) : null}

        {editing ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {t('stock.pagination.editHint')}
          </p>
        ) : null}
      </div>
    </nav>
  );
}

export default StockPaginationBar;
