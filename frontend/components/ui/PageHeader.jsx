import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ 
  title, 
  description, 
  children,
  className 
}) {
  return (
    <div className={cn(
      "flex flex-row items-center justify-between gap-4 mb-6",
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
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