'use client'

import { useState, useEffect, forwardRef } from 'react'
import { format, parse, isValid } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value = '', onChange, disabled, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    // Convert ISO date string to display format (DD/MM/YYYY)
    const formatDateForDisplay = (isoDate: string) => {
      if (!isoDate) return ''
      try {
        const date = new Date(isoDate)
        if (isValid(date)) {
          return format(date, 'dd/MM/yyyy')
        }
      } catch {
        // Invalid date
      }
      return ''
    }

    // Convert display format to ISO date string
    const parseDisplayToISO = (display: string) => {
      const cleanDisplay = display.replace(/[^0-9/]/g, '')
      if (cleanDisplay.length !== 10) return ''
      
      try {
        // Parse as DD/MM/YYYY
        const date = parse(cleanDisplay, 'dd/MM/yyyy', new Date())
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd')
        }
      } catch {
        // Invalid date
      }
      return ''
    }

    // Initialize display value from prop value
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatDateForDisplay(value))
      }
    }, [value, isFocused])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value
      
      // Allow only numbers and forward slashes
      const cleaned = input.replace(/[^0-9/]/g, '')
      
      // Auto-insert slashes at appropriate positions
      let formatted = cleaned
      if (cleaned.length >= 2 && !cleaned.includes('/')) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2)
      }
      if (cleaned.length >= 5 && cleaned.indexOf('/', 3) === -1) {
        const firstSlash = formatted.indexOf('/')
        if (firstSlash !== -1) {
          const beforeSlash = formatted.slice(0, firstSlash + 1)
          const afterSlash = formatted.slice(firstSlash + 1).replace('/', '')
          if (afterSlash.length >= 2) {
            formatted = beforeSlash + afterSlash.slice(0, 2) + '/' + afterSlash.slice(2)
          }
        }
      }
      
      // Limit length to DD/MM/YYYY format (10 chars)
      if (formatted.length > 10) {
        formatted = formatted.slice(0, 10)
      }
      
      setDisplayValue(formatted)
      
      // If we have a complete date, validate and convert to ISO
      if (formatted.length === 10) {
        const isoDate = parseDisplayToISO(formatted)
        if (isoDate && onChange) {
          onChange(isoDate)
        }
      } else if (onChange) {
        // Clear the value if the date is incomplete
        onChange('')
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Reformat on blur to ensure consistency
      if (displayValue) {
        const isoDate = parseDisplayToISO(displayValue)
        if (isoDate) {
          setDisplayValue(formatDateForDisplay(isoDate))
          if (onChange) {
            onChange(isoDate)
          }
        } else {
          // Clear invalid date
          setDisplayValue('')
          if (onChange) {
            onChange('')
          }
        }
      }
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-surface px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-text-secondary",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-secondary",
          className
        )}
        {...props}
      />
    )
  }
)

DateInput.displayName = 'DateInput'