import React from 'react'
import { Dialog, DialogContent } from './dialog'
import { Button } from './button'

export function AlertDialog({ open, onOpenChange, children }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>
}

export function AlertDialogContent({ className, children, ...props }) {
  return (
    <DialogContent className={cn('max-w-md', className)} {...props}>
      {children}
    </DialogContent>
  )
}

export function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function AlertDialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }) {
  return (
    <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />
  )
}

export function AlertDialogAction({ className, children, ...props }) {
  return (
    <Button className={className} {...props}>
      {children}
    </Button>
  )
}

export function AlertDialogCancel({ className, children, ...props }) {
  return (
    <Button variant="outline" className={className} {...props}>
      {children}
    </Button>
  )
}

