/**
 * Layout principale: header con selettore mood, bottom nav, pulsante "Aggiungi" per loggati,
 * icona ingranaggio per aprire Impostazioni in un drawer slide-over da destra
 * Responsive: bottom nav su mobile, sidebar su desktop (da implementare)
 * NOTA: Questo componente assume che l'utente sia SEMPRE autenticato (gestito da App.tsx)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import { BookOpen, Shuffle, Home, History, Settings as SettingsIcon, Plus, LogOut, User, X } from 'lucide-react'
import { clsx } from 'clsx'
import { MOOD_OPTIONS, MOOD_LABELS } from '../lib/config'
import { SettingsPage } from '../pages/Settings'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

// NAV_ITEMS senza Impostazioni (ora accessibile da header)
const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Elenco', icon: BookOpen, exact: true },
  { path: '/roulette', label: 'Roulette', icon: Shuffle },
  { path: '/pantry', label: 'Cosa ho in casa', icon: Home },
  { path: '/history', label: 'Cronologia', icon: History },
]

// Pagine che mostrano la barra dei mood
const MOOD_BAR_PATHS = ['/', '/roulette', '/pantry']
const MOOD_BAR_PREFIXES = ['/recipe/']

function shouldShowMoodBar(pathname: string): boolean {
  if (MOOD_BAR_PATHS.includes(pathname)) return true
  return MOOD_BAR_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { mood, setMood } = useMood()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const moodBarRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const handleMoodClick = useCallback((m: string) => {
    setMood(m as any)
  }, [setMood])

  // Gestione tastiera per la barra mood
  const handleMoodKeyDown = useCallback((e: React.KeyboardEvent, targetMood: string) => {
    const moods = MOOD_OPTIONS
    const currentIndex = moods.indexOf(targetMood as any)
    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        newIndex = (currentIndex + 1) % moods.length
        break
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = (currentIndex - 1 + moods.length) % moods.length
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = moods.length - 1
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        setMood(moods[newIndex] as any)
        return
      default:
        return
    }
    ;(moodBarRef.current?.querySelector(`[data-mood="${moods[newIndex]}"]`) as HTMLElement)?.focus()
  }, [setMood])

  // Chiudi drawer con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsDrawer) {
        setShowSettingsDrawer(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettingsDrawer])

  // Focus management per il drawer
  useEffect(() => {
    if (showSettingsDrawer) {
      // Focus primo elemento focusable nel drawer
      setTimeout(() => {
        const focusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }, 100)
    }
  }, [showSettingsDrawer])

  const showMoodBar = shouldShowMoodBar(location.pathname)

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
  }

  const handleOpenSettings = () => {
    setShowSettingsDrawer(true)
    setShowUserMenu(false)
  }

  const handleCloseSettings = () => {
    setShowSettingsDrawer(false)
  }

  return (
    <div className="app-layout">
      {/* Header fisso con titolo e azioni utente */}
      <header className="app-header" role="banner">
        <div className="header-left">
          <img src="/android-chrome-512x512.png" alt="" aria-hidden="true" className="app-logo" />
          <h1 className="app-title">Ricettario</h1>
        </div>

        <div className="header-right">
          {/* Pulsante Aggiungi ricetta - solo su pagine che non sono settings/form */}
          {location.pathname !== '/settings' && !location.pathname.startsWith('/add') && !location.pathname.startsWith('/edit/') && (
            <button
              type="button"
              className="btn-primary btn-add touch-target"
              onClick={() => navigate('/add')}
              aria-label="Aggiungi ricetta"
            >
              <Plus size={28} strokeWidth={2.5} />
              <span className="btn-add-text">Aggiungi</span>
            </button>
          )}

          {/* Icona Impostazioni (ingranaggio) */}
          <button
            type="button"
            className="settings-trigger touch-target"
            onClick={handleOpenSettings}
            aria-label="Apri impostazioni"
            aria-expanded={showSettingsDrawer}
          >
            <SettingsIcon size={24} />
          </button>

          {/* Menu utente */}
          <div className="user-menu" role="menu">
            <button
              type="button"
              className="user-trigger touch-target"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-haspopup="true"
              aria-expanded={showUserMenu}
            >
              <User size={20} />
            </button>

            {showUserMenu && (
              <div className="user-dropdown" role="menu">
                <div className="user-info">
                  <span className="user-email">{user?.email}</span>
                </div>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mood Bar - fissa sotto l'header, scorre orizzontalmente */}
      {showMoodBar && (
        <nav
          ref={moodBarRef}
          className="mood-bar sticky top-14 z-30 bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 border-b border-[var(--bordo)] px-4 py-2"
          role="group"
          aria-label="Seleziona mood"
          style={{
            // Fade edges gradient
            maskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
          }}
        >
          <div className="max-w-[720px] mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory [justify-content:safe_center]">
              {MOOD_OPTIONS.map((m, index) => (
                <button
                  key={m}
                  ref={(el) => {
                    // Auto-scroll to keep active button visible
                    if (el && m === mood && index > 0) {
                      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                    }
                  }}
                  type="button"
                  role="tab"
                  aria-selected={mood === m}
                  aria-controls={`mood-panel-${m}`}
                  id={`mood-tab-${m}`}
                  data-mood={m}
                  onClick={() => handleMoodClick(m)}
                  onKeyDown={(e) => handleMoodKeyDown(e, m)}
                  className={clsx(
                    'mood-pill flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium',
                    'transition-[transform,background-color,box-shadow,border-color] duration-200 ease-out',
                    'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
                    'touch-manipulation',
                    'min-h-[44px] min-w-[44px]',
                    'active:scale-[0.97]',
                    mood === m
                      ? 'bg-[var(--accento)] text-[var(--accento-testo)] shadow-[var(--elevazione-2)]'
                      : 'bg-[var(--card)] text-[var(--testo)] border border-[var(--card-bordo)] hover:bg-[var(--card-bordo)] active:bg-[var(--card-bordo)]'
                  )}
                  style={{
                    scrollSnapAlign: 'center',
                    scrollSnapStop: 'normal',
                  }}
                >
                  {MOOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main content - usa Outlet per nested routes */}
      <main className="app-main" role="main">
        <Outlet />
      </main>

      {/* Bottom Navigation (mobile) - SENZA Impostazioni */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigazione principale">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || (item.exact && location.pathname === '/')
          return (
            <button
              key={item.path}
              type="button"
              className={clsx('nav-item', isActive && 'active')}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon size={24} />
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Overlay per chiudere dropdown clickando fuori */}
      {showUserMenu && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowUserMenu(false)}
          aria-hidden="true"
        />
      )}

      {/* Settings Drawer - Slide-over da destra */}
      {showSettingsDrawer && (
        <>
          {/* Overlay scuro per chiudere cliccando fuori */}
          <div
            className="settings-drawer-overlay fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseSettings}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside
            ref={drawerRef}
            className="settings-drawer fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-[var(--sfondo)] border-l border-[var(--bordo)] shadow-[var(--elevazione-overlay)] animate-in slide-in-from-right-full duration-300 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="Impostazioni"
          >
            {/* Header del drawer */}
            <div className="drawer-header flex items-center justify-between p-4 border-b border-[var(--bordo)] sticky top-0 bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 z-10">
              <h2 className="text-lg font-semibold text-[var(--testo)]">Impostazioni</h2>
              <button
                type="button"
                className="drawer-close touch-target p-2 rounded-xl hover:bg-[var(--card-bordo)] text-[var(--secondario)] transition-colors"
                onClick={handleCloseSettings}
                aria-label="Chiudi impostazioni"
              >
                <X size={24} />
              </button>
            </div>
            {/* Contenuto del drawer */}
            <div className="drawer-content overflow-y-auto h-[calc(100%-60px)] p-4 pb-24">
              <SettingsPage onClose={handleCloseSettings} />
            </div>
          </aside>
        </>
      )}
    </div>
  )
}