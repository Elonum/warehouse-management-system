import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from './button'

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div 
        className="relative z-50 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg p-6 dark:bg-slate-900 dark:border dark:border-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function DialogFooter({ className, ...props }) {
  return (
    <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />
  )
}

