import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export function DropdownMenu({ children }) {
  return <div className="relative inline-block">{children}</div>
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  if (asChild) {
    return React.cloneElement(children, props)
  }
  return <div {...props}>{children}</div>
}

export function DropdownMenuContent({ align = 'start', className, children, ...props }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-md dark:bg-slate-950 dark:border-slate-800',
            align === 'end' && 'right-0',
            !isOpen && 'hidden',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export function DropdownMenuItem({ className, asChild, children, ...props }) {
  if (asChild) {
    return React.cloneElement(children, {
      className: cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      ),
      ...props,
    })
  }
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <div
      className={cn('my-1 h-px bg-slate-200 dark:bg-slate-800', className)}
      {...props}
    />
  )
}

