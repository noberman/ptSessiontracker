import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary",
          "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

export { Select }