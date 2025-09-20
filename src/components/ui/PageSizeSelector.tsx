'use client'

interface PageSizeSelectorProps {
  value: number
  onChange: (value: number) => void
  options?: number[]
  disabled?: boolean
}

export function PageSizeSelector({ 
  value, 
  onChange,
  options = [10, 20, 50, 100],
  disabled = false
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-secondary">Show</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-text-secondary">per page</span>
    </div>
  )
}