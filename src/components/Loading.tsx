/**
 * Componenti di loading: Skeleton, Spinner, PageLoader
 */

import { clsx } from 'clsx'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * Skeleton per card ricetta
 */
export function RecipeCardSkeleton() {
  return (
    <article className="recipe-card card skeleton">
      <div className="card-header">
        <div className="skeleton-line" style={{ width: '70%' }} />
      </div>
      <div className="skeleton-line" style={{ width: '40%', marginTop: '8px' }} />
      <div className="recipe-meta">
        <div className="skeleton-line" style={{ width: '60%' }} />
        <div className="skeleton-line" style={{ width: '50%' }} />
      </div>
      <div className="recipe-tags">
        <div className="skeleton-badge" />
        <div className="skeleton-badge" />
      </div>
      <div className="recipe-footer">
        <div className="skeleton-line" style={{ width: '50%' }} />
        <div className="skeleton-line" style={{ width: '40%' }} />
      </div>
    </article>
  )
}

/**
 * Skeleton generico per liste
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="loading-skeleton">
      {[...Array(count)].map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton per dettaglio ricetta
 */
export function RecipeDetailSkeleton() {
  return (
    <div className="detail-page">
      <header className="detail-header">
        <div className="skeleton-line" style={{ width: '60%' }} />
      </header>
      <main className="detail-content">
        <section className="card skeleton">
          <div className="skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton-line" style={{ width: '30%' }} />
        </section>
        <section className="card skeleton">
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
        </section>
        <section className="card skeleton">
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
        </section>
      </main>
    </div>
  )
}

/**
 * Spinner semplice
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  ariaLabel?: string
}

export function Spinner({ size = 'md', className, ariaLabel = 'Caricamento' }: SpinnerProps) {
  const sizeClass = clsx('spinner', {
    'spinner-sm': size === 'sm',
    'spinner-lg': size === 'lg',
  })

  return (
    <span className={clsx(sizeClass, className)} aria-label={ariaLabel} role="status">
      <Loader2 size={size === 'sm' ? 16 : size === 'lg' ? 32 : 24} className="spin" />
      <span className="sr-only">{ariaLabel}</span>
    </span>
  )
}

/**
 * Overlay di loading per azioni (es. salvataggio)
 */
export function LoadingOverlay({ message = 'Salvataggio...' }: { message?: string }) {
  return (
    <div className="loading-overlay" role="alert" aria-live="polite">
      <div className="loading-overlay-content">
        <Spinner size="lg" ariaLabel={message} />
        <p>{message}</p>
      </div>
    </div>
  )
}

/**
 * Stato vuoto generico
 */
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('empty-state card', className)}>
      {icon && <div className="empty-icon">{icon}</div>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Stato errore generico
 */
interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({ message, onRetry, retryLabel = 'Riprova', className }: ErrorStateProps) {
  return (
    <div className={clsx('error-state card', className)}>
      <AlertCircle size={48} className="error-icon" />
      <h2>Errore</h2>
      <p>{message}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

