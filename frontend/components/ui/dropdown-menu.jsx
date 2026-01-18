import React, { useState, createContext, useContext, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

const DropdownMenuContext = createContext(null)

export function DropdownMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, menuRef }}>
      <div className="relative inline-block" ref={menuRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const { setIsOpen } = useContext(DropdownMenuContext)

  const handleClick = (e) => {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        handleClick(e)
        children.props.onClick?.(e)
      },
    })
  }
  return (
    <div {...props} onClick={handleClick}>
      {children}
    </div>
  )
}

export function DropdownMenuContent({ align = 'start', className, children, ...props }) {
  const { isOpen, setIsOpen } = useContext(DropdownMenuContext)

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setIsOpen(false)}
      />
      <div
        className={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-md dark:bg-slate-950 dark:border-slate-800 mt-1',
          align === 'end' && 'right-0',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

export function DropdownMenuItem({ className, asChild, children, onClick, ...props }) {
  const { setIsOpen } = useContext(DropdownMenuContext)

  const handleClick = (e) => {
    e.stopPropagation()
    if (onClick) {
      onClick(e)
    }
    setIsOpen(false)
  }

  if (asChild) {
    return React.cloneElement(children, {
      className: cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
        className
      ),
      onClick: (e) => {
        handleClick(e)
        children.props.onClick?.(e)
      },
      ...props,
    })
  }
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
        className
      )}
      onClick={handleClick}
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
