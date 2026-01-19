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

export function SelectContent({ className, children, ...props }) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-md dark:bg-slate-950 dark:border-slate-800',
        className
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

