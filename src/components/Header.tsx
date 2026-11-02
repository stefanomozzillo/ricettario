import { useRef, useCallback } from 'react'
import { Filter } from 'lucide-react'
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
  onMoodChange?: (mood: string) => void
}

export function Header({
  title,
  showFilters,
  onFiltersToggle,
  hasActiveFilters,
  filterCount = 0,
  children,
  onMoodChange,
}: HeaderProps) {
  const { mood, setMood } = useMood()
  const moodBarRef = useRef<HTMLDivElement>(null)

  const totalFilterCount = filterCount + (mood !== 'tutti' ? 1 : 0)

  const handleMoodClick = useCallback((m: string) => {
    onMoodChange?.(m)
    setMood(m as any)
  }, [onMoodChange, setMood])

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

  return (
    <header className="sticky top-0 z-40 bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 border-b border-[var(--bordo)]">
      <div className="max-w-[720px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-xl font-semibold text-[var(--testo)] truncate">{title}</h1>

          <div className="flex items-center gap-2">
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

        {/* Mood Bar - Horizontal pill buttons */}
        <nav
          ref={moodBarRef}
          className="mood-bar relative flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          role="group"
          aria-label="Seleziona mood"
          style={{
            // Fade edges gradient
            maskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
          }}
        >
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
                'transition-[transform,background-color,box-shadow] duration-200 ease-out',
                'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
                'touch-manipulation',
                'min-h-[44px] min-w-[44px]', // Target tocco 44px
                'active:scale-[0.97]',
                mood === m
                  ? 'bg-[var(--accento)] text-[var(--accento-test)] shadow-md'
                  : 'bg-[var(--card)] text-[var(--testo)] border border-[var(--bordo)] hover:bg-[var(--bordo)] active:bg-[var(--bordo)]'
              )}
              style={{
                // Scroll snap per ogni pillola
                scrollSnapAlign: 'center',
                scrollSnapStop: 'normal',
              }}
            >
              {MOOD_LABELS[m]}
            </button>
          ))}
        </nav>

        {/* Children (filters panel, etc.) */}
        {children}
      </div>
    </header>
  )
}