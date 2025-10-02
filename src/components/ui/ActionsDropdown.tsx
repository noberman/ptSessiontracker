'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Edit, Trash } from 'lucide-react'
import Link from 'next/link'

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-surface-hover transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="h-5 w-5 text-text-secondary" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg z-10">
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
        </div>
      )}
    </div>
  )
}