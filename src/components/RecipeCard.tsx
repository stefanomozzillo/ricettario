import { Clock, Flame } from 'lucide-react'
import { clsx } from 'clsx'
import { MOOD_LABELS, STATO_LABELS, DIFFICOLTA_LABELS, DIFFICOLTA_BADGE_CLASSES, DIFFICOLTA_ICON_CLASSES, type Difficolta, type Mood } from '../lib/config'
import { Badge } from './Badge'

interface RecipeCardProps {
  recipe: {
    id: string
    titolo: string
    autore: string | null
    stato: 'completa' | 'da_completare'
    mood: string | null
    difficolta: string | null
    tempo_minuti: number | null
    immagini: string[] | null
  }
  onClick: () => void
  showPhotos?: boolean
}

const formatTime = (value: number | null | undefined) => {
  if (value == null || value === 0) return <span className="text-[11px] text-[var(--secondario)]">—</span>
  return <span className="font-medium text-[var(--testo)]">{value} min</span>
}

const formatAutore = (value: string | null) => value || 'Autore non indicato'

export function RecipeCard({ recipe, onClick, showPhotos = true }: RecipeCardProps) {
  const moodLabel = recipe.mood ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const images = recipe.immagini ?? []
  const hasPhotos = showPhotos && images.length > 0
  const firstImage = hasPhotos ? images[0] : null
  // Show placeholder when photos mode is ON but recipe has no images
  const showPlaceholder = showPhotos && !hasPhotos

  return (
    <article
      className={clsx(
        'recipe-card relative bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)]',
        'shadow-[var(--elevazione-1)]',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-[var(--elevazione-3)] hover:border-[var(--accento)]/30',
        'active:scale-[0.98] active:shadow-[var(--elevazione-1)]',
        'touch-manipulation',
        'overflow-hidden',
        'h-full flex flex-col'
      )}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="listitem"
      tabIndex={0}
    >
      {firstImage && (
        <div className="relative aspect-video w-full overflow-hidden flex-shrink-0">
          <img
            src={firstImage}
            alt={`Foto di ${recipe.titolo}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      {showPlaceholder && (
        <div className="aspect-video w-full bg-[var(--card-bordo)]/30 flex-shrink-0" aria-hidden="true" />
      )}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Titolo ricetta + badge stato */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--testo)] line-clamp-1 leading-snug flex-1 min-w-0">
            {recipe.titolo}
          </h3>
          {recipe.stato === 'da_completare' && (
            <Badge variant="stato" className="flex-shrink-0">{STATO_LABELS.da_completare}</Badge>
          )}
        </div>

        {/* Autore + Mood */}
        <div className="flex items-center gap-2 text-sm text-[var(--secondario)] mb-3 flex-wrap">
          <span>di {formatAutore(recipe.autore)}</span>
          {recipe.mood && (
            <Badge variant="mood" className="px-2 py-0.5">{moodLabel}</Badge>
          )}
        </div>

        {/* Footer minimal: Tempo | Difficoltà */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--card-bordo)]">
          {/* Tempo */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--secondario)]">
            <Clock size={14} aria-hidden="true" className="text-[var(--accento)] flex-shrink-0" />
            {formatTime(recipe.tempo_minuti)}
          </div>

          {/* Difficoltà */}
          {recipe.difficolta && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Flame
                size={14}
                role="img"
                aria-label={`Difficoltà: ${DIFFICOLTA_LABELS[recipe.difficolta as Difficolta]}`}
                className={clsx('fill-current', DIFFICOLTA_ICON_CLASSES[recipe.difficolta as Difficolta])}
              />
              <span className={DIFFICOLTA_BADGE_CLASSES[recipe.difficolta as Difficolta]}>
                {DIFFICOLTA_LABELS[recipe.difficolta as Difficolta]}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}