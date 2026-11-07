/**
 * Pagina Impostazioni - Pannello Accessibilità
 * Contiene: Logout, Dimensione testo, Riduci animazioni
 * NO mood bar (gestito dal Layout), NO export/import, NO gestione basi (spostata in Pantry)
 */

import { useState, useEffect, useCallback } from 'react'
import { User, LogOut, Text, Minimize, AlertCircle, CheckCircle, X, Settings as SettingsIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'

// Chiavi localStorage
const STORAGE_KEY_TEXT_SIZE = 'ricettario-text-size'
const STORAGE_KEY_REDUCED_MOTION = 'ricettario-reduced-motion'

type TextSize = 'small' | 'normal' | 'large'

interface SettingsPageProps {
  onClose?: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { user, signOut, loading: authLoading } = useAuth()

  const handleClose = () => {
    onClose?.()
  }

  const [textSize, setTextSize] = useState<TextSize>('normal')
  const [reducedMotion, setReducedMotion] = useState<boolean>(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carica preferenze da localStorage all'avvio
  useEffect(() => {
    try {
      const storedTextSize = localStorage.getItem(STORAGE_KEY_TEXT_SIZE)
      if (storedTextSize) {
        setTextSize(storedTextSize as TextSize)
      }

      const storedReducedMotion = localStorage.getItem(STORAGE_KEY_REDUCED_MOTION)
      if (storedReducedMotion !== null) {
        // Se l'utente ha salvato una preferenza esplicita, usa quella
        setReducedMotion(JSON.parse(storedReducedMotion))
      } else {
        // Altrimenti usa la preferenza di sistema
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        setReducedMotion(prefersReduced)
      }
    } catch {
      // Fallback silenzioso: usa valori di default
    }
  }, [])

  // Salva preferenza dimensione testo
  const handleTextSizeChange = useCallback((size: TextSize) => {
    try {
      setTextSize(size)
      localStorage.setItem(STORAGE_KEY_TEXT_SIZE, size)
      // Applica la classe al document.documentElement per CSS globale
      document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large')
      document.documentElement.classList.add(`text-size-${size}`)
    } catch (err) {
      console.error('Errore salvataggio dimensione testo:', err)
      showMessage('error', 'Impossibile salvare la preferenza')
    }
  }, [])

  // Salva preferenza riduci animazioni
  const handleReducedMotionChange = useCallback((enabled: boolean) => {
    try {
      setReducedMotion(enabled)
      localStorage.setItem(STORAGE_KEY_REDUCED_MOTION, JSON.stringify(enabled))
      // Applica la classe al document.documentElement per CSS globale
      if (enabled) {
        document.documentElement.classList.add('reduce-motion')
      } else {
        document.documentElement.classList.remove('reduce-motion')
      }
    } catch (err) {
      console.error('Errore salvataggio riduci animazioni:', err)
      showMessage('error', 'Impossibile salvare la preferenza')
    }
  }, [])

  // Applica le classi al mount (per persistenza tra ricariche)
  useEffect(() => {
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large')
    document.documentElement.classList.add(`text-size-${textSize}`)
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }, [textSize, reducedMotion])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const handleLogout = async () => {
    if (!window.confirm('Vuoi uscire?')) return
    try {
      await signOut()
      handleClose()
    } catch (err) {
      console.error('Errore logout:', err)
      showMessage('error', 'Errore durante il logout')
    }
  }

  if (authLoading) {
    return (
      <div className="page-container settings-page">
        <main className="max-w-[720px] mx-auto px-4">
          <div className="loading-skeleton space-y-4">
            <div className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
              <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
              <div className="h-4 w-1/2 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/3 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/4 bg-[var(--bordo)] rounded" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container settings-page">
        <main className="max-w-[720px] mx-auto px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
            <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Accesso richiesto</h2>
            <p className="text-[var(--secondario)]">Accedi per gestire le impostazioni</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-container settings-page">
      <main className="max-w-[720px] mx-auto px-4 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Toast message */}
        {message && (
          <div className={clsx('toast fixed top-4 left-4 right-4 max-w-[720px] mx-auto z-50 px-4', message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300')}>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-current/20 animate-in slide-in-from-top-2 duration-200">
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span className="flex-1 text-sm">{message.text}</span>
              <Button variant="ghost" size="sm" onClick={() => setMessage(null)} aria-label="Chiudi">
                <X size={18} />
              </Button>
            </div>
          </div>
        )}

        {/* Profilo & Account */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4">
          <h2 className="text-lg font-semibold text-[var(--testo)] mb-4 flex items-center gap-2">
            <User size={20} className="text-[var(--accento)]" />
            Account
          </h2>
          <div className="profile-info flex items-center gap-4 p-4 bg-[var(--sfondo)] rounded-xl mb-4">
            <div className="avatar-placeholder w-16 h-16 rounded-2xl bg-[var(--accento)] text-[var(--accento-testo)] flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="profile-details flex-1 min-w-0">
              <p className="profile-email font-medium text-[var(--testo)] truncate">{user.email}</p>
              <p className="profile-role text-sm text-[var(--secondario)]">Ruolo: {user.user_metadata?.ruolo || 'user'}</p>
              <p className="profile-member text-sm text-[var(--secondario)]">Membro dal: {new Date(user.created_at).toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          <div className="settings-actions space-y-2">
            <Button variant="danger" onClick={handleLogout} className="w-full gap-2">
              <LogOut size={18} /> Esci
            </Button>
            {/* Placeholder per futuro "Cambia password" */}
            {/* <Button variant="secondary" className="w-full gap-2">
              <Key size={18} /> Cambia password
            </Button> */}
          </div>
        </section>

        {/* Accessibilità */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4">
          <h2 className="text-lg font-semibold text-[var(--testo)] mb-4 flex items-center gap-2">
            <SettingsIcon size={20} className="text-[var(--accento)]" />
            Accessibilità
          </h2>

          {/* Dimensione testo */}
          <div className="setting-item mb-6">
            <div className="setting-header flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Text size={20} className="text-[var(--accento)]" />
                <div>
                  <p className="font-medium text-[var(--testo)]">Dimensione testo</p>
                  <p className="text-sm text-[var(--secondario)]">Modifica la dimensione del testo in tutta l'app</p>
                </div>
              </div>
            </div>
            <div className="text-size-options flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Scegli dimensione testo">
              {([
                { value: 'small', label: 'Piccolo', icon: Minimize },
                { value: 'normal', label: 'Normale', icon: Text },
                { value: 'large', label: 'Grande', icon: Text },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={textSize === opt.value}
                  onClick={() => handleTextSizeChange(opt.value as TextSize)}
                  className={clsx(
                    'text-size-option flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all duration-150 ease-out',
                    'touch-manipulation min-h-[44px] min-w-[80px]',
                    'active:scale-[0.97]',
                    textSize === opt.value
                      ? 'border-[var(--accento)] bg-[var(--accento)]/10 text-[var(--accento)]'
                      : 'border-[var(--card-bordo)] bg-[var(--sfondo)] text-[var(--testo)] hover:border-[var(--accento)]/50'
                  )}
                >
                  <opt.icon size={20} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Riduci animazioni */}
          <div className="setting-item">
            <div className="setting-header flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Minimize size={20} className="text-[var(--accento)]" />
                <div>
                  <p className="font-medium text-[var(--testo)]">Riduci animazioni</p>
                  <p className="text-sm text-[var(--secondario)]">Disabilita transizioni e animazioni non essenziali</p>
                </div>
              </div>
            </div>
            <label className="reduced-motion-toggle flex items-center justify-between cursor-pointer touch-manipulation">
              <div className="flex items-center gap-3">
                <span className="text-[var(--testo)] font-medium">{reducedMotion ? 'Attivo' : 'Disattivo'}</span>
                <span className="text-sm text-[var(--secondario)]">
                  {reducedMotion ? 'Le animazioni sono ridotte' : 'Animazioni complete attive'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => handleReducedMotionChange(!reducedMotion)}
                className={clsx(
                  'relative w-12 h-7 rounded-full transition-colors duration-200 ease-out',
                  'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
                  reducedMotion
                    ? 'bg-[var(--accento)]'
                    : 'bg-[var(--card-bordo)]'
                )}
                aria-label={reducedMotion ? 'Disattiva riduzione animazioni' : 'Attiva riduzione animazioni'}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-[var(--elevazione-1)] transition-transform duration-200 ease-out',
                    reducedMotion ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </label>
            <p className="setting-hint text-xs text-[var(--secondario)] mt-2">
              Di default segue la preferenza di sistema ({window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'ridotta' : 'completa'}). La tua scelta sovrascrive l'impostazione di sistema.
            </p>
          </div>
        </section>

        {/* Info versione */}
        <footer className="settings-footer text-center text-sm text-[var(--secondario)] py-8">
          <p>Ricettario v1.0.0</p>
          <p>Dati su Supabase · Hosting Cloudflare Pages</p>
        </footer>
      </main>
    </div>
  )
}

// Re-export con nome compatibile
export { SettingsPage as Settings }