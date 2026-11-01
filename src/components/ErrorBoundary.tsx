/**
 * Error Boundary per catturare errori di rendering React.
 *
 * NOTA: la classe NON usa hook (useNavigate ecc.) — gli hook funzionano solo
 * nei function component. La navigazione è passata via prop dal wrapper
 * ErrorBoundaryWithRouter, che è un function component dentro il Router.
 */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onNavigateHome?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = { hasError: false, error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log esplicito in console: mostra l'errore originale catturato
    console.error('[ErrorBoundary] Errore catturato:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleGoHome = () => {
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome()
    } else {
      window.location.assign('/')
    }
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-content card">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Qualcosa è andato storto</h2>
            <p className="error-message">
              Si è verificato un errore imprevisto.
            </p>
            {this.state.error && (
              <details className="error-details">
                <summary>Dettagli tecnici</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <div className="error-actions">
              <button className="btn-primary" onClick={this.handleRetry}>
                <RefreshCw size={18} /> Riprova
              </button>
              <button className="btn-secondary" onClick={this.handleGoHome}>
                <Home size={18} /> Torna all'elenco
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Wrapper function component: usa useNavigate (lecito qui) e passa
 * la navigazione alla classe via prop.
 */
export function ErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <ErrorBoundaryClass fallback={fallback} onNavigateHome={() => navigate('/')}>
      {children}
    </ErrorBoundaryClass>
  )
}

/**
 * Hook per lanciare errori verso l'Error Boundary (uso programmatico).
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error
  }
}
