import React from 'react';
import { cn } from '@/lib/utils';

export function Dialog({ open, onOpenChange, children, className }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 z-0 bg-black/50"
        aria-hidden
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 flex min-h-full flex-col justify-center px-4 py-8 pointer-events-none sm:px-6">
        <div
          className={cn('mx-auto w-full pointer-events-auto', className)}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'mx-auto w-full bg-white rounded-lg shadow-lg p-6 dark:bg-slate-900 dark:border dark:border-slate-800',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />;
}
