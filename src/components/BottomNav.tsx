import { Home, Shuffle, Package, Settings, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './Button'

const NAV_ITEMS = [
  { path: '/', label: 'Elenco', icon: Home, exact: true },
  { path: '/roulette', label: 'Roulette', icon: Shuffle, exact: false },
  { path: '/pantry', label: 'Cosa ho in casa', icon: Package, exact: false },
  { path: '/settings', label: 'Impostazioni', icon: Settings, exact: false },
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 border-t border-[var(--bordo)] pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="navigation"
        aria-label="Navigazione principale"
      >
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-around h-16">
            {NAV_ITEMS.map(item => (
              <button
                key={item.path}
                type="button"
                className={clsx(
                  'flex flex-col items-center gap-1 px-3 py-2',
                  'text-sm font-medium transition-all duration-150',
                  'touch-manipulation',
                  isActive(item.path, item.exact)
                    ? 'text-[var(--accento)]'
                    : 'text-[var(--secondario)] hover:text-[var(--testo)]'
                )}
                onClick={() => navigate(item.path)}
                aria-current={isActive(item.path, item.exact) ? 'page' : undefined}
                aria-label={item.label}
              >
                <item.icon size={24} aria-hidden="true" className={clsx(isActive(item.path, item.exact) && 'active:scale-110')} />
                <span className="text-xs leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {user && (
        <Button
          variant="fab"
          size="lg"
          onClick={() => navigate('/new')}
          aria-label="Aggiungi ricetta"
          className="bottom-20 sm:bottom-24"
        >
          <Plus size={28} aria-hidden="true" />
        </Button>
      )}

      <div className="pb-20 sm:pb-24" aria-hidden="true" />
    </>
  )
}