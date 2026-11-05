import { clsx } from 'clsx'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, className, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl' +
      ' transition-[transform,filter,background-color,border-color,box-shadow] duration-100' +
      ' focus-visible:outline-2 focus-visible:outline-offset-2' +
      ' disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-[var(--accento)] text-[var(--accento-testo)]' +
        ' hover:brightness-105 active:brightness-95 active:scale-[0.97]' +
        ' focus-visible:outline-[var(--accento)]',
      secondary: 'bg-[var(--card)] text-[var(--testo)] border border-[var(--bordo)]' +
        ' hover:bg-[var(--bordo)] active:bg-[var(--bordo)] active:scale-[0.97]' +
        ' focus-visible:outline-[var(--accento)]',
      ghost: 'text-[var(--testo)]' +
        ' hover:bg-[var(--bordo)] active:bg-[var(--bordo)] active:scale-[0.97]' +
        ' focus-visible:outline-[var(--accento)]',
      danger: 'bg-red-600 text-white' +
        ' hover:brightness-105 active:brightness-95 active:scale-[0.97]' +
        ' focus-visible:outline-red-600',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2',
    }

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <circle className="opacity-75" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'