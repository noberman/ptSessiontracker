'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export interface Option {
  value: string
  label: string
  subLabel?: string // For showing email, location, etc.
  group?: string // For optgroup support
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
  showGroups?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Type to search...",
  disabled = false,
  required = false,
  className = "",
  id,
  showGroups = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Find selected option
  const selectedOption = options.find(opt => opt.value === value)
  
  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    
    const term = searchTerm.toLowerCase()
    return options.filter(option => 
      option.label.toLowerCase().includes(term) ||
      option.subLabel?.toLowerCase().includes(term)
    )
  }, [options, searchTerm])
  
  // Group options if needed
  const groupedOptions = useMemo(() => {
    if (!showGroups) return { '': filteredOptions }
    
    return filteredOptions.reduce((groups, option) => {
      const group = option.group || ''
      if (!groups[group]) groups[group] = []
      groups[group].push(option)
      return groups
    }, {} as Record<string, Option[]>)
  }, [filteredOptions, showGroups])
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
  }
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          rounded-lg border border-border px-3 py-2
          text-sm bg-surface
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover cursor-pointer'}
          ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''}
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-text-primary' : 'text-text-secondary'}>
          {selectedOption ? (
            <div className="text-left">
              <div>{selectedOption.label}</div>
              {selectedOption.subLabel && (
                <div className="text-xs text-text-secondary">{selectedOption.subLabel}</div>
              )}
            </div>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface rounded-lg border border-border shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border sticky top-0 bg-surface">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface text-text-primary"
              />
            </div>
          </div>
          
          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                No results found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  {group && showGroups && (
                    <div className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-secondary sticky top-0">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full text-left px-3 py-2 text-sm
                        hover:bg-surface-hover transition-colors
                        flex items-center justify-between
                        ${option.value === value ? 'bg-primary-50 text-primary-700' : 'text-text-primary'}
                      `}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      <div>
                        <div>{option.label}</div>
                        {option.subLabel && (
                          <div className="text-xs text-text-secondary">{option.subLabel}</div>
                        )}
                      </div>
                      {option.value === value && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Hidden select for form submission */}
      {required && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}