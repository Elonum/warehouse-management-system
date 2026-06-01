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
    <div className={cn(
      "flex flex-row items-center justify-between gap-4 mb-6",
      className
    )}>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          <span>{title}</span>
          {titleHint ? (
            <span
              className="relative inline-flex cursor-help items-center group"
              tabIndex={0}
              role="button"
              aria-label={titleHint}
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 rounded-md border bg-white px-2 py-1.5 text-xs font-normal leading-relaxed text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {titleHint}
              </span>
            </span>
          ) : null}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center flex-shrink-0 gap-3">
          {children}
        </div>
      )}
    </div>
  );
}