'use client'

import { forwardRef } from 'react'
import ReactDatePicker from 'react-datepicker'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import 'react-datepicker/dist/react-datepicker.css'

export interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxDate?: Date
  minDate?: Date
}

// Custom input component - clean without icon
const CustomInput = forwardRef<
  HTMLInputElement,
  { 
    value?: string; 
    onClick?: () => void; 
    onChange?: () => void; 
    placeholder?: string; 
    disabled?: boolean; 
    className?: string 
  }
>(({ value, onClick, placeholder, disabled, className }, ref) => (
  <input
    ref={ref}
    type="text"
    value={value || ''}
    onClick={onClick}
    onChange={() => {}} // Prevent direct editing
    placeholder={placeholder}
    disabled={disabled}
    readOnly
    className={cn(
      // Clean input styling
      "bg-surface border border-border text-text-primary text-sm rounded-lg",
      "focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
      "block w-full px-3 py-2.5",
      "placeholder:text-text-secondary",
      "cursor-pointer",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-secondary",
      className
    )}
  />
))

CustomInput.displayName = 'CustomInput'

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  disabled,
  maxDate,
  minDate,
}: DatePickerProps) {
  // Parse the ISO date string to Date object
  const selectedDate = value ? new Date(value) : null

  // Handle date selection
  const handleSelect = (date: Date | null) => {
    if (date) {
      // Convert to ISO string (YYYY-MM-DD)
      onChange?.(format(date, 'yyyy-MM-dd'))
    } else {
      onChange?.('')
    }
  }

  return (
    <div className={cn("relative", className)}>
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleSelect}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        disabled={disabled}
        maxDate={maxDate}
        minDate={minDate}
        customInput={<CustomInput />}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        wrapperClassName="w-full"
      />
    </div>
  )
}