'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Edit, Trash } from 'lucide-react'
import Link from 'next/link'
import { createPortal } from 'react-dom'

interface Action {
  label: string
  href?: string
  onClick?: () => void
  icon?: 'view' | 'edit' | 'delete'
  variant?: 'default' | 'danger'
  show?: boolean
}

interface ActionsDropdownProps {
  actions: Action[]
}

export function ActionsDropdown({ actions }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close dropdown on scroll or resize
  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      setIsOpen(false)
    }

    // Use capture phase (true) to catch all scroll events including on child elements
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Small timeout to ensure DOM has updated after any layout changes (e.g., page size change)
      setTimeout(() => {
        if (!buttonRef.current) return
        
        const rect = buttonRef.current.getBoundingClientRect()
        const dropdownWidth = 192 // 192px = 48rem (w-48)
        const dropdownHeight = 200 // Approximate max height
        const padding = 8
        
        // Calculate position - since we're using position: fixed, we use viewport coordinates directly
        let top = rect.bottom + padding
        let left = rect.right - dropdownWidth
        
        // Check if dropdown would go off the bottom of the viewport
        if (top + dropdownHeight > window.innerHeight) {
          // Position above the button instead
          top = rect.top - dropdownHeight - padding
        }
        
        // Check if dropdown would go off the left edge
        if (left < padding) {
          left = padding
        }
        
        // Check if dropdown would go off the right edge
        if (left + dropdownWidth > window.innerWidth) {
          left = window.innerWidth - dropdownWidth - padding
        }
        
        setDropdownPosition({ top, left })
      }, 0)
    }
  }, [isOpen])

  const visibleActions = actions.filter(action => action.show !== false)

  if (visibleActions.length === 0) {
    return null
  }

  const getIcon = (iconType?: string) => {
    switch (iconType) {
      case 'view':
        return <Eye className="h-4 w-4 mr-2" />
      case 'edit':
        return <Edit className="h-4 w-4 mr-2" />
      case 'delete':
        return <Trash className="h-4 w-4 mr-2" />
      default:
        return null
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-surface-hover transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="h-5 w-5 text-text-secondary" />
      </button>
      
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-48 rounded-lg border border-border bg-surface shadow-lg z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="py-1">
            {visibleActions.map((action, index) => {
              const itemClass = `flex items-center w-full px-4 py-2 text-sm text-left hover:bg-surface-hover transition-colors ${
                action.variant === 'danger' ? 'text-danger hover:bg-danger/10' : 'text-text-primary'
              }`

              if (action.href) {
                return (
                  <Link
                    key={index}
                    href={action.href}
                    className={itemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    {getIcon(action.icon)}
                    {action.label}
                  </Link>
                )
              }

              return (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick?.()
                    setIsOpen(false)
                  }}
                  className={itemClass}
                >
                  {getIcon(action.icon)}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}