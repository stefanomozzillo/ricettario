import { Clock, Users, Flame } from 'lucide-react'
import { clsx } from 'clsx'
import { MOOD_LABELS, CATEGORIE_LABELS, TAG_LABELS, STATO_LABELS, DIFFICOLTA_LABELS, DIFFICOLTA_BADGE_CLASSES, DIFFICOLTA_ICON_CLASSES, type Difficolta } from '../lib/config'
import type { Mood } from '../lib/config'
import { Badge } from './Badge'

interface RecipeCardProps {
  recipe: {
    id: string
    titolo: string
    autore: string | null
    stato: 'completa' | 'da_completare'
    categoria: string | null
    mood: string | null
    difficolta: string | null
    tags: string[] | null
    tempo_minuti: number | null
    porzioni: number | null
    porzioni_unita: string | null
  }
  onClick: () => void
}

// Helper per valori numerici: evita di mostrare "0", usa placeholder
const formatNumberOrPlaceholder = (value: number | null | undefined, unit: string = '') => {
  if (value == null || value === 0) return 'da aggiungere'
  return `${value} ${unit}`.trim()
}

const formatAutore = (value: string | null) => value || 'Autore non indicato'
const formatPorzioni = (value: number | null, unit: string | null) => {
  if (value == null || value === 0) return 'Porzioni non indicate'
  return `${value} ${unit || 'porzioni'}`
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  console.log('Recipe in card:', recipe.id, recipe.difficolta)
  const moodLabel = recipe.mood ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const categoriaLabel = recipe.categoria ? CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] : '—'
  const tags = recipe.tags || []
  const firstTags = tags.slice(0, 2)
  const remainingTags = tags.length - 2

  return (
    <article
      className={clsx(
        'recipe-card relative bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)]',
        'shadow-[var(--elevazione-1)]',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-[var(--elevazione-3)] hover:border-[var(--accento)]/30',
        'active:scale-[0.98] active:shadow-[var(--elevazione-1)]',
        'touch-manipulation',
        'overflow-hidden'
      )}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="listitem"
      tabIndex={0}
      style={{
        // Subtle mood-based accent border on hover
        '--mood-accent': recipe.mood ? 'var(--accento)' : 'transparent'
      } as React.CSSProperties}
    >
      {/* Mood accent bar at top - subtle indicator */}
      {recipe.mood && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accento)] opacity-0 hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--testo)] line-clamp-1 flex-1 min-w-0 leading-snug">
            {recipe.titolo}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {recipe.stato === 'da_completare' && (
              <Badge variant="stato" className="flex-shrink-0">{STATO_LABELS.da_completare}</Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-[var(--secondario)] mb-3 leading-relaxed">di {formatAutore(recipe.autore)}</p>

        <div className="flex items-center gap-2 sm:gap-3 text-sm text-[var(--secondario)] mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium text-[var(--testo)]">Mood:</span>
            <Badge variant="mood" className="px-2 py-0.5">{moodLabel}</Badge>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium text-[var(--testo)]">Categoria:</span> {categoriaLabel}
          </span>
        </div>

        {firstTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {firstTags.map(tag => (
              <Badge key={tag} variant="tag" className="px-2 py-0.5 text-xs">
                {TAG_LABELS[tag as keyof typeof TAG_LABELS] || tag}
              </Badge>
            ))}
            {remainingTags > 0 && (
              <Badge variant="tag" className="px-2 py-0.5 text-xs text-[var(--secondario)] bg-[var(--bordo)]">+{remainingTags}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 sm:gap-5 text-sm text-[var(--secondario)] pt-3 border-t border-[var(--card-bordo)]">
          <span className="flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" className="text-[var(--accento)]" />
            <span className="font-medium text-[var(--testo)]">{formatNumberOrPlaceholder(recipe.tempo_minuti, 'min')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" className="text-[var(--accento)]" />
            <span className="font-medium text-[var(--testo)]">{formatPorzioni(recipe.porzioni, recipe.porzioni_unita)}</span>
          </span>
          {recipe.difficolta && (
            <span className="flex items-center gap-1.5">
              <Flame
                size={14}
                role="img"
                aria-label={`Difficoltà: ${DIFFICOLTA_LABELS[recipe.difficolta as Difficolta]}`}
                className={clsx('fill-current', DIFFICOLTA_ICON_CLASSES[recipe.difficolta as Difficolta])}
              />
              <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', DIFFICOLTA_BADGE_CLASSES[recipe.difficolta as Difficolta])}>
                {DIFFICOLTA_LABELS[recipe.difficolta as Difficolta]}
              </span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}