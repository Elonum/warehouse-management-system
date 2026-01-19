import React, { useState, createContext, useContext, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const DropdownMenuContext = createContext(null)

export function DropdownMenu({ children, align = 'start' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = 160
      const menuHeight = 200
      const spacing = 4

      let left = rect.left
      let top = rect.bottom + spacing
      let menuAlign = align

      if (align === 'end') {
        left = rect.right - menuWidth
      }

      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8
        menuAlign = 'end'
      }

      if (left < 8) {
        left = 8
        menuAlign = 'start'
      }

      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - spacing
        if (top < 8) {
          top = 8
        }
      }

      setPosition((prev) => {
        const newPos = {
          top: top,
          left: left,
          align: menuAlign,
        }
        if (prev.top === newPos.top && prev.left === newPos.left && prev.align === newPos.align) {
          return prev
        }
        return newPos
      })
    }
  }, [align])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      updatePosition()
      document.addEventListener('mousedown', handleClickOutside)
      
      const handleScroll = () => {
        updatePosition()
      }
      
      const handleResize = () => {
        updatePosition()
      }

      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isOpen, updatePosition])

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, menuRef, triggerRef, position, updatePosition }}>
      <div className="relative inline-block" ref={triggerRef}>
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
  const { isOpen, setIsOpen, position } = useContext(DropdownMenuContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const contentStyle = {
    position: 'fixed',
    top: `${position.top}px`,
    left: position.align === 'end' ? 'auto' : `${position.left}px`,
    right: position.align === 'end' ? `${window.innerWidth - position.left}px` : 'auto',
    zIndex: 9999,
  }

  const content = (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsOpen(false)}
      />
      <div
        className={cn(
          'min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-slate-950 dark:border-slate-800 py-1',
          className
        )}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </>
  )

  return createPortal(content, document.body)
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
