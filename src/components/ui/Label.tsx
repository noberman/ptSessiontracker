import { LabelHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-text-primary mb-1",
          className
        )}
        {...props}
      >
        {children}
      </label>
    )
  }
)

Label.displayName = 'Label'

export { Label }