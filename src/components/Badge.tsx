import { clsx } from 'clsx'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'mood' | 'tag' | 'stato' | 'filter'
  children: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'tag', className, children, ...props }, ref) => {
    const variants = {
      mood: 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accento)] text-[var(--accento-test)]',
      tag: 'px-2 py-0.5 rounded-full text-xs bg-[var(--bordo)] text-[var(--secondario)]',
      stato: 'px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      filter: 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accento)] text-[var(--accento-test)]',
    }

    return (
      <span
        ref={ref}
        className={clsx('inline-flex items-center gap-1', variants[variant], className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'