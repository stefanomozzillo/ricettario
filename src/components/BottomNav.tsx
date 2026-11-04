import { Home, Shuffle, Package, Plus, History } from 'lucide-react'
import { clsx } from 'clsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './Button'

const NAV_ITEMS = [
  { path: '/', label: 'Elenco', icon: Home, exact: true },
  { path: '/roulette', label: 'Roulette', icon: Shuffle, exact: false },
  { path: '/pantry', label: 'Cosa ho in casa', icon: Package, exact: false },
  { path: '/history', label: 'Cronologia', icon: History, exact: false },
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav
        className="bottom-nav"
        role="navigation"
        aria-label="Navigazione principale"
      >
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-around h-16 relative">
            {/* Active indicator bar - animated */}
            <div
              className="bottom-nav-indicator absolute bottom-0 left-0 h-0.5 rounded-full bg-[var(--accento)] transition-all duration-300 ease-out"
              style={{
                width: `${100 / NAV_ITEMS.length}%`,
                transform: `translateX(${NAV_ITEMS.findIndex(item => isActive(item.path, item.exact)) * (100 / NAV_ITEMS.length)}%)`
              }}
              aria-hidden="true"
            />

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path, item.exact)
              return (
                <button
                  key={item.path}
                  type="button"
                  className={clsx(
                    'bottom-nav-item flex flex-col items-center gap-1 px-3 py-2 relative z-10',
                    'text-sm font-medium',
                    'touch-manipulation',
                    'transition-[transform,color] duration-200 ease-out',
                    'active:scale-[0.95]',
                    active
                      ? 'text-[var(--accento)]'
                      : 'text-[var(--secondario)]'
                  )}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon size={24} aria-hidden="true" className={clsx(active && 'text-[var(--accento)]')} />
                  <span className="nav-label text-xs leading-none">{item.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--accento)] animate-in zoom-in-95" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {user && (
        <Button
          variant="fab"
          size="lg"
          onClick={() => navigate('/add')}
          aria-label="Aggiungi ricetta"
          className="bottom-nav-fab"
        >
          <Plus size={32} strokeWidth={2.5} aria-hidden="true" />
        </Button>
      )}

      <div className="bottom-nav-spacer" aria-hidden="true" />
    </>
  )
}