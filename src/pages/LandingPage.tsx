/**
 * Landing Page / Login
 * Schermata di benvenuto con form di accesso
 * UI UX Pro Max + Mood palette (default "tutti")
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

export function LandingPage() {
  const { signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Evita flash di contenuto non stilato durante l'idratazione
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Inserisci email e password')
      return
    }

    setIsLoading(true)
    try {
      await signIn(email.trim(), password)
      // onAuthStateChange in AuthContext aggiornerà lo stato
      // Il redirect avviene via App.tsx che rileva l'utente loggato
      navigate('/')
    } catch (err: unknown) {
      console.error('Errore login:', err)
      const message = err instanceof Error ? err.message : 'Credenziali non valide'
      // Supabase restituisce "Invalid login credentials" per credenziali errate
      if (message.includes('Invalid login credentials') || message.includes('Email not confirmed')) {
        setError('Email o password non corrette')
      } else {
        setError('Errore di accesso. Riprova.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="landing-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--sfondo)' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--accento)' }} />
      </div>
    )
  }

  return (
    <div className="landing-container min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--sfondo)]">
      <div className="w-full max-w-[400px]">
        {/* Hero Section */}
        <header className="text-center mb-10 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accento)]/10 text-[var(--accento)] mb-6 animate-in zoom-in-95 duration-500 delay-100">
            <BookOpen size={32} aria-hidden="true" />
          </div>
          <h1 className="font-titoli text-3xl sm:text-4xl font-bold text-[var(--testo)] mb-2 animate-in slide-in-from-top-2 duration-400 delay-200">
            Ricettario
          </h1>
          <p className="text-[var(--secondario)] text-lg animate-in slide-in-from-top-2 duration-400 delay-300">
            Le tue ricette, organizzate con stile
          </p>
        </header>

        {/* Login Card */}
        <main className="login-card animate-in zoom-in-95 duration-500 delay-400"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-bordo)',
            borderRadius: '1.5rem',
            boxShadow: 'var(--elevazione-2)',
            padding: '2.5rem',
          }}>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Error Toast */}
            {error && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  background: 'color-mix(in srgb, var(--accento) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--accento) 30%, transparent)',
                  color: 'var(--accento)',
                }}
                role="alert"
                aria-live="polite"
              >
                <AlertCircle size={18} className="flex-shrink-0" aria-hidden="true" />
                <span className="text-sm flex-1">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="form-field space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[var(--testo)]">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setError(null)}
                  className="form-input pl-10"
                  placeholder="mario@esempio.it"
                  disabled={isLoading || authLoading}
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={!!error}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-field space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[var(--testo)]">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setError(null)}
                  className="form-input pl-10 pr-12"
                  placeholder="••••••••"
                  disabled={isLoading || authLoading}
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] hover:text-[var(--testo)] transition-colors p-1"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  aria-pressed={showPassword}
                  disabled={isLoading || authLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={clsx(
                'btn-primary w-full py-3.5 rounded-xl font-semibold text-base',
                'touch-manipulation',
                'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
                'active:scale-[0.98]',
                'transition-[transform,filter] duration-150 ease-out',
                isLoading || authLoading ? 'opacity-70 cursor-wait' : 'hover:brightness-110'
              )}
              disabled={isLoading || authLoading}
              style={{
                backgroundColor: 'var(--accento)',
                color: 'var(--accento-testo)',
                minHeight: '48px',
              }}
            >
              {isLoading || authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="spin" size={20} aria-hidden="true" />
                  <span>Accesso in corso...</span>
                </span>
              ) : (
                'Accedi'
              )}
            </button>

          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-sm text-[var(--secondario)]">
            Non hai un account? Contatta l'amministratore per l'invito.
          </p>
        </main>
      </div>
    </div>
  )
}

// Re-export per compatibilità
export { LandingPage as LoginPage }