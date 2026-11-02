import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { clsx } from 'clsx'
import { MOOD_OPTIONS, MOOD_LABELS } from '../lib/config'
import { useMood } from '../contexts/MoodContext'

interface HeaderProps {
  title: string
  showFilters?: boolean
  onFiltersToggle?: () => void
  hasActiveFilters?: boolean
  filterCount?: number
  children?: React.ReactNode
}

export function Header({
  title,
  showFilters,
  onFiltersToggle,
  hasActiveFilters,
  filterCount = 0,
  children,
}: HeaderProps) {
  const { mood, setMood } = useMood()
  const [moodOpen, setMoodOpen] = useState(false)
  const moodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moodRef.current && !moodRef.current.contains(e.target as Node)) {
        setMoodOpen(false)
      }
    }
    if (moodOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moodOpen])

  const totalFilterCount = filterCount + (mood !== 'tutti' ? 1 : 0)

  return (
    <header className="sticky top-0 z-40 bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 border-b border-[var(--bordo)]">
      <div className="max-w-[720px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-xl font-semibold text-[var(--testo)] truncate">{title}</h1>

          <div className="flex items-center gap-2">
            {/* Mood Selector Pill */}
            <div className="relative" ref={moodRef}>
              <button
                type="button"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'bg-[var(--accento)] text-[var(--accento-test)]',
                  'hover:brightness-105 active:brightness-95',
                  'transition-all duration-150',
                  'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2'
                )}
                onClick={() => setMoodOpen(!moodOpen)}
                aria-expanded={moodOpen}
                aria-haspopup="listbox"
                aria-label={`Mood attuale: ${MOOD_LABELS[mood]}. Clicca per cambiare`}
              >
                <span className="text-sm font-medium">{MOOD_LABELS[mood]}</span>
                <ChevronDown size={16} className={clsx('transition-transform', moodOpen && 'rotate-180')} />
              </button>

              {moodOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[var(--card)] border border-[var(--bordo)] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in-0 duration-150">
                  <ul role="listbox" aria-label="Seleziona mood">
                    {MOOD_OPTIONS.map(m => (
                      <li key={m} role="option" aria-selected={mood === m}>
                        <button
                          type="button"
                          className={clsx(
                            'w-full px-4 py-2.5 text-left text-sm',
                            'hover:bg-[var(--bordo)]',
                            'transition-colors duration-100',
                            mood === m ? 'bg-[var(--bordo)] font-medium text-[var(--accento)]' : 'text-[var(--testo)]'
                          )}
                          onClick={() => { setMood(m); setMoodOpen(false); }}
                        >
                          {MOOD_LABELS[m]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {hasActiveFilters && onFiltersToggle && (
              <button
                type="button"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'bg-[var(--card)] text-[var(--testo)] border border-[var(--bordo)]',
                  'hover:bg-[var(--bordo)] active:bg-[var(--bordo)]',
                  'transition-all duration-150',
                  'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
                  showFilters && 'bg-[var(--bordo)]'
                )}
                onClick={onFiltersToggle}
                aria-expanded={showFilters}
                aria-label={`Filtri${totalFilterCount > 0 ? ` (${totalFilterCount} attivi)` : ''}`}
              >
                <Filter size={18} />
                <span className="text-sm font-medium hidden sm:inline">Filtri</span>
                {totalFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs bg-[var(--accento)] text-[var(--accento-test)]">
                    {totalFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Children (filters panel, etc.) */}
        {children}
      </div>
    </header>
  )
}