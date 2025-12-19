import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function Collapsible({ open, onOpenChange, children, ...props }) {
  const [isOpen, setIsOpen] = useState(open ?? false)

  const handleToggle = () => {
    const newValue = !isOpen
    setIsOpen(newValue)
    onOpenChange?.(newValue)
  }

  return (
    <CollapsibleContext.Provider value={{ isOpen, onToggle: handleToggle }}>
      <div {...props}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

const CollapsibleContext = React.createContext({})

export function CollapsibleTrigger({ asChild, children, className, ...props }) {
  const { isOpen, onToggle } = React.useContext(CollapsibleContext)
  
  if (asChild) {
    return React.cloneElement(children, {
      onClick: onToggle,
      className: cn(className),
      ...props,
    })
  }

  return (
    <button
      className={cn('flex items-center', className)}
      onClick={onToggle}
      {...props}
    >
      {children}
    </button>
  )
}

export function CollapsibleContent({ className, children, ...props }) {
  const { isOpen } = React.useContext(CollapsibleContext)
  
  if (!isOpen) return null

  return (
    <div className={cn('overflow-hidden', className)} {...props}>
      {children}
    </div>
  )
}

