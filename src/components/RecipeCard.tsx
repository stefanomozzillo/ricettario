import { Clock, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { MOOD_LABELS, CATEGORIE_LABELS, TAG_LABELS, STATO_LABELS } from '../lib/config'
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
  const moodLabel = recipe.mood ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const categoriaLabel = recipe.categoria ? CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] : '—'
  const tags = recipe.tags || []
  const firstTags = tags.slice(0, 2)
  const remainingTags = tags.length - 2

  return (
    <article
      className={clsx(
        'card relative bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)]',
        'shadow-[var(--elevazione-1)]',
        'transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-[var(--elevazione-2)]',
        'active:scale-[0.99] active:shadow-[var(--elevazione-1)]',
        'touch-manipulation'
      )}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="listitem"
      tabIndex={0}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--testo)] line-clamp-1 flex-1 min-w-0 leading-snug">
            {recipe.titolo}
          </h3>
          {recipe.stato === 'da_completare' && (
            <Badge variant="stato" className="flex-shrink-0">{STATO_LABELS.da_completare}</Badge>
          )}
        </div>

        <p className="text-sm text-[var(--secondario)] mb-3 leading-relaxed">di {formatAutore(recipe.autore)}</p>

        <div className="flex items-center gap-2 sm:gap-3 text-sm text-[var(--secondario)] mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium">Mood:</span>
            <Badge variant="mood" className="px-2 py-0.5">{moodLabel}</Badge>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">Categoria:</span> {categoriaLabel}
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
              <Badge variant="tag" className="px-2 py-0.5 text-xs">+{remainingTags}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 sm:gap-5 text-sm text-[var(--secondario)] pt-3 border-t border-[var(--card-bordo)]">
          <span className="flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" className="text-[var(--accento)]" />
            {formatNumberOrPlaceholder(recipe.tempo_minuti, 'min')}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" className="text-[var(--accento)]" />
            {formatPorzioni(recipe.porzioni, recipe.porzioni_unita)}
          </span>
        </div>
      </div>
    </article>
  )
}