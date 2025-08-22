import { InputHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const inputVariants = cva(
  'block w-full border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0',
  {
    variants: {
      variant: {
        default: 'border-border text-text-primary placeholder-text-tertiary focus:border-primary-500 focus:ring-primary-500',
        error: 'border-error-300 text-error-900 placeholder-error-400 focus:ring-error-500 focus:border-error-500',
        success: 'border-success-300 focus:ring-success-500 focus:border-success-500',
      },
      size: {
        sm: 'text-sm py-1.5 px-2.5',
        md: 'text-sm py-2 px-3',
        lg: 'text-base py-2.5 px-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <input
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }