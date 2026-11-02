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
        'card relative bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--bordo)]',
        'transition-all duration-200',
        'hover:shadow-md hover:-translate-y-1 active:scale-[0.99]',
        'touch-manipulation'
      )}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="listitem"
      tabIndex={0}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-[var(--testo)] line-clamp-1 flex-1 min-w-0">
            {recipe.titolo}
          </h3>
          {recipe.stato === 'da_completare' && (
            <Badge variant="stato">{STATO_LABELS.da_completare}</Badge>
          )}
        </div>

        <p className="text-sm text-[var(--secondario)] mb-3">di {formatAutore(recipe.autore)}</p>

        <div className="flex items-center gap-3 text-sm text-[var(--secondario)] mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-medium">Mood:</span>
            <Badge variant="mood">{moodLabel}</Badge>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">Categoria:</span> {categoriaLabel}
          </span>
        </div>

        {firstTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {firstTags.map(tag => (
              <Badge key={tag} variant="tag">
                {TAG_LABELS[tag as keyof typeof TAG_LABELS] || tag}
              </Badge>
            ))}
            {remainingTags > 0 && (
              <Badge variant="tag">+{remainingTags}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-[var(--secondario)] pt-3 border-t border-[var(--bordo)]">
          <span className="flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            {formatNumberOrPlaceholder(recipe.tempo_minuti, 'min')}
          </span>
          <span className="flex items-center gap-1">
            <Users size={14} aria-hidden="true" />
            {formatPorzioni(recipe.porzioni, recipe.porzioni_unita)}
          </span>
        </div>
      </div>
    </article>
  )
}