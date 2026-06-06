import React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PageHeader({
  title,
  description,
  titleHint,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:items-center',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
          <span className="min-w-0 break-words">{title}</span>
          {titleHint ? (
            <span
              className="relative inline-flex shrink-0 cursor-help items-center group"
              tabIndex={0}
              role="button"
              aria-label={titleHint}
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border bg-white px-2 py-1.5 text-xs font-normal leading-relaxed text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {titleHint}
              </span>
            </span>
          ) : null}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
