'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Globe, Search } from 'lucide-react'

interface TimezonePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

// Common IANA timezones grouped by region
const TIMEZONES = {
  'Asia': [
    { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
    { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (UTC+8)' },
    { value: 'Asia/Jakarta', label: 'Jakarta (UTC+7)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
    { value: 'Asia/Manila', label: 'Manila (UTC+8)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
    { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
    { value: 'Asia/Taipei', label: 'Taipei (UTC+8)' },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
    { value: 'Asia/Kolkata', label: 'Mumbai/Kolkata (UTC+5:30)' },
  ],
  'Australia & Pacific': [
    { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (UTC+11)' },
    { value: 'Australia/Brisbane', label: 'Brisbane (UTC+10)' },
    { value: 'Australia/Perth', label: 'Perth (UTC+8)' },
    { value: 'Pacific/Auckland', label: 'Auckland (UTC+13)' },
  ],
  'Europe': [
    { value: 'Europe/London', label: 'London (UTC+0)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
    { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (UTC+1)' },
    { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
    { value: 'Europe/Rome', label: 'Rome (UTC+1)' },
    { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
    { value: 'Europe/Athens', label: 'Athens (UTC+2)' },
  ],
  'Americas': [
    { value: 'America/New_York', label: 'New York (UTC-5)' },
    { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
    { value: 'America/Denver', label: 'Denver (UTC-7)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
    { value: 'America/Toronto', label: 'Toronto (UTC-5)' },
    { value: 'America/Vancouver', label: 'Vancouver (UTC-8)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'America/Mexico_City', label: 'Mexico City (UTC-6)' },
  ],
  'Africa & Middle East': [
    { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
    { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem (UTC+2)' },
  ],
}

export function TimezonePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select timezone',
  className = ''
}: TimezonePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the current timezone's label
  const currentTimezone = useMemo(() => {
    for (const region of Object.values(TIMEZONES)) {
      const tz = region.find(t => t.value === value)
      if (tz) return tz
    }
    return null
  }, [value])

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!searchTerm) return TIMEZONES
    
    const filtered: Partial<typeof TIMEZONES> = {}
    for (const [region, zones] of Object.entries(TIMEZONES)) {
      const matchingZones = zones.filter(
        tz => 
          tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tz.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (matchingZones.length > 0) {
        filtered[region as keyof typeof TIMEZONES] = matchingZones
      }
    }
    return filtered as typeof TIMEZONES
  }, [searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      // Use capture phase to ensure we catch clicks before other handlers
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelect = (timezone: string) => {
    onChange(timezone)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-border rounded-md 
          bg-background-primary text-left flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-500 cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-text-secondary" />
          <span className={currentTimezone ? 'text-text-primary' : 'text-text-tertiary'}>
            {currentTimezone?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Invisible backdrop to close dropdown on click */}
          <div 
            className="fixed inset-0 z-[9998]" 
            aria-hidden="true"
            onClick={() => {
              setIsOpen(false)
              setSearchTerm('')
            }}
          />
          <div 
            ref={dropdownRef}
            className="absolute z-[9999] mt-1 w-full rounded-md shadow-2xl border border-border bg-white dark:bg-gray-900"
            style={{ 
              minWidth: '300px',
            }}
          >
          {/* Search Input */}
          <div className="p-2 border-b border-border bg-background-primary rounded-t-md">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search timezones..."
                className="w-full pl-8 pr-3 py-2 border border-border rounded bg-background-secondary
                         text-text-primary placeholder-text-tertiary text-sm
                         focus:outline-none focus:border-primary-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Timezone List */}
          <div className="max-h-64 overflow-y-auto bg-background-primary rounded-b-md">
            {Object.entries(filteredTimezones).map(([region, zones]) => (
              <div key={region}>
                <div className="px-3 py-2 text-xs font-semibold text-text-secondary bg-background-secondary sticky top-0">
                  {region}
                </div>
                {zones.map((tz) => (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => handleSelect(tz.value)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-background-tertiary
                      flex items-center justify-between group
                      ${value === tz.value ? 'bg-primary-50 text-primary-600' : 'bg-background-primary text-text-primary'}
                    `}
                  >
                    <span>{tz.label}</span>
                    {value === tz.value && (
                      <span className="text-xs text-primary-600">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(filteredTimezones).length === 0 && (
              <div className="px-3 py-8 text-center text-text-tertiary text-sm bg-background-primary">
                No timezones found
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}