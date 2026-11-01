/**
 * Layout principale: header con selettore mood, bottom nav, pulsante "Aggiungi" per loggati
 * Responsive: bottom nav su mobile, sidebar su desktop (da implementare)
 */

import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import {
  BookOpen, Shuffle, Home, Settings as SettingsIcon, Plus, ChevronDown,
  LogOut, User, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Elenco', icon: BookOpen, exact: true },
  { path: '/roulette', label: 'Roulette', icon: Shuffle },
  { path: '/pantry', label: 'Cosa ho in casa', icon: Home },
  { path: '/settings', label: 'Impostazioni', icon: SettingsIcon },
]

export function Layout() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { mood, setMood, moodOptions, moodLabels } = useMood()
  const location = useLocation()
  const navigate = useNavigate()
  const [showMoodMenu, setShowMoodMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  if (authLoading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--sfondo)'
      }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--accento)' }} />
      </div>
    )
  }

  const isLoggedIn = !!user

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    setShowMoodMenu(false)
    setShowUserMenu(false)
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header" role="banner">
        <div className="header-left">
          <h1 className="app-title">Ricettario</h1>
        </div>

        <div className="header-center">
          {/* Selettore Mood */}
          <div className="mood-selector" role="combobox" aria-label="Seleziona mood" aria-expanded={showMoodMenu}>
            <button
              type="button"
              className="mood-trigger touch-target"
              onClick={() => setShowMoodMenu(!showMoodMenu)}
              aria-haspopup="listbox"
            >
              <span className="mood-label">{moodLabels[mood]}</span>
              <ChevronDown className={clsx('mood-chevron', showMoodMenu && 'rotate')} size={16} />
            </button>

            {showMoodMenu && (
              <ul className="mood-dropdown" role="listbox" aria-label="Mood disponibili">
                {moodOptions.map(m => (
                  <li key={m} role="option" aria-selected={mood === m}>
                    <button
                      type="button"
                      className={clsx('mood-option', mood === m && 'active')}
                      onClick={() => { setMood(m); setShowMoodMenu(false); }}
                    >
                      {moodLabels[m]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="header-right">
          {isLoggedIn && (
            <>
              {/* Pulsante Aggiungi ricetta */}
              <button
                type="button"
                className="btn-primary btn-add touch-target"
                onClick={() => navigate('/add')}
                aria-label="Aggiungi ricetta"
              >
                <Plus size={20} />
                <span className="btn-add-text">Aggiungi</span>
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
                      <span className="user-email">{user.email}</span>
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
            </>
          )}
        </div>
      </header>

      {/* Main content - usa Outlet per nested routes */}
      <main className="app-main" role="main">
        <Outlet />
      </main>

      {/* Bottom Navigation (mobile) */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigazione principale">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || (item.exact && location.pathname === '/')
          return (
            <button
              key={item.path}
              type="button"
              className={clsx('nav-item', isActive && 'active')}
              onClick={() => handleNavClick(item.path)}
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
      {(showMoodMenu || showUserMenu) && (
        <div
          className="dropdown-overlay"
          onClick={() => { setShowMoodMenu(false); setShowUserMenu(false); }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}