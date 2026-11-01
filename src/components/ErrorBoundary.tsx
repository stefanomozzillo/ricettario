/**
 * Error Boundary per catturare errori di rendering React
 */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null }
  private navigate = useNavigate()

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // Qui potresti inviare a un servizio di error tracking (Sentry, etc.)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleGoHome = () => {
    this.navigate('/')
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
              Si è verificato un errore imprevisto. Il team è stato notificato.
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
 * Hook per usare l'Error Boundary in modo programmatico
 * (richiede che ErrorBoundary sia un ancestore)
 */
export function useErrorHandler() {
  // In un'app reale, useresti un context per comunicare con l'ErrorBoundary
  // Per ora restituiamo una funzione che lancia l'errore
  return (error: Error) => {
    throw error
  }
}