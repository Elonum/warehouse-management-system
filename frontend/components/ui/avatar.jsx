import React from 'react'
import { cn } from '@/lib/utils'

export function Avatar({ className, ...props }) {
  return (
    <div
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

export function AvatarFallback({ className, ...props }) {
  return (
    <div
      className={cn('flex h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800', className)}
      {...props}
    />
  )
}

