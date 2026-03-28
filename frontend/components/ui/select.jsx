import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { Button } from './button'

const SelectContext = React.createContext({})

export function Select({ value, onValueChange, children, ...props }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative" ref={containerRef} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children, ...props }) {
  const { value, isOpen, setIsOpen } = React.useContext(SelectContext)
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('w-full justify-between', className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
      {...props}
    >
      {children || <SelectValue />}
      <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')} />
    </Button>
  )
}

export function SelectValue({ placeholder = 'Select...', children }) {
  const { value } = React.useContext(SelectContext)
  if (children) {
    return <span>{children}</span>
  }
  return <span>{value || placeholder}</span>
}

export function SelectContent({ className, children, side = 'bottom', ...props }) {
  const { isOpen } = React.useContext(SelectContext)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'absolute left-0 z-50 max-h-[min(50vh,20rem)] min-w-[8rem] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 dark:ring-white/10',
        side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectItem({ className, children, value, ...props }) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext)
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onValueChange?.(value);
        setIsOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  )
}

