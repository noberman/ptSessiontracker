'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
  subLabel?: string // For showing email, location, etc.
}

interface SearchableMultiSelectProps {
  options: Option[]
  value: string[] // Array of selected values
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function SearchableMultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Type to search...",
  disabled = false,
  className = "",
  id
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Find selected options
  const selectedOptions = options.filter(opt => value.includes(opt.value))
  
  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    
    const term = searchTerm.toLowerCase()
    return options.filter(option => 
      option.label.toLowerCase().includes(term) ||
      (option.subLabel && option.subLabel.toLowerCase().includes(term))
    )
  }, [options, searchTerm])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])
  
  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }
  
  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }
  
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }
  
  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder
    if (selectedOptions.length === 1) return selectedOptions[0].label
    return `${selectedOptions.length} selected`
  }
  
  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Main button */}
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border border-border px-3 py-2 text-left",
          "bg-surface text-text-primary",
          "hover:bg-surface-hover focus:border-primary-500",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          "text-sm flex items-center justify-between",
          "transition-colors",
          disabled && "cursor-not-allowed opacity-50 bg-background-secondary"
        )}
      >
        <div className="flex-1 overflow-hidden">
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.length <= 2 ? (
                selectedOptions.map(opt => (
                  <span 
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                  >
                    {opt.label}
                    <X
                      className="h-3 w-3 hover:text-primary-900 cursor-pointer"
                      onClick={(e) => removeOption(opt.value, e)}
                    />
                  </span>
                ))
              ) : (
                <span className="text-text-primary">
                  {selectedOptions.length} selected
                </span>
              )}
            </div>
          ) : (
            <span className="text-text-secondary">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {selectedOptions.length > 0 && (
            <X
              className="h-4 w-4 text-text-secondary hover:text-text-primary cursor-pointer"
              onClick={clearAll}
            />
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-text-secondary transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-2 text-sm
                         placeholder:text-text-secondary focus:outline-none focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-secondary">No results found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-md",
                      "flex items-center justify-between gap-2",
                      "transition-colors",
                      isSelected
                        ? "bg-primary-50 text-primary-700"
                        : "hover:bg-surface-hover text-text-primary"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{option.label}</div>
                      {option.subLabel && (
                        <div className="text-xs text-text-secondary truncate">{option.subLabel}</div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
          
          {/* Footer with count */}
          {selectedOptions.length > 0 && (
            <div className="px-3 py-2 border-t border-border text-xs text-text-secondary">
              {selectedOptions.length} of {options.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  )
}