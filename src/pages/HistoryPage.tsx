/**
 * Pagina Cronologia: elenco cronologico delle preparazioni ("La faccio!"),
 * dalla più recente alla meno recente. Dati da localStorage (src/lib/history.ts).
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History as HistoryIcon, ChevronRight, Trash2, Clock } from 'lucide-react'
import { getHistory, removeHistoryEntry, clearHistory, formatHistoryDate, type HistoryEntry } from '../lib/history'
import { CATEGORIE_LABELS, MOOD_LABELS } from '../lib/config'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { BackToTop } from '../components/BackToTop'

function categoriaLabel(categoria: string | null): string {
  if (!categoria) return ''
  return (CATEGORIE_LABELS as Record<string, string>)[categoria] ?? categoria
}

function moodLabel(mood: string | null): string | null {
  if (!mood) return null
  return (MOOD_LABELS as Record<string, string>)[mood] ?? mood
}

export function HistoryPage() {
  const navigate = useNavigate()
  // Stato locale per forzare il re-render dopo eliminazioni
  const [version, setVersion] = useState(0)
  // Ricalcola l'elenco a ogni cambio di versione (dopo eliminazione/svuotamento)
  const entries = useMemo(() => getHistory(), [version])

  const refresh = () => setVersion(v => v + 1)

  const handleRemove = (id: string) => {
    removeHistoryEntry(id)
    refresh()
  }

  const handleClear = () => {
    if (window.confirm('Eliminare tutta la cronologia delle preparazioni?')) {
      clearHistory()
      refresh()
    }
  }

  return (
    <div className="page-container history-page">
      <main className="history-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--testo)] flex items-center gap-2">
            <HistoryIcon size={24} className="text-[var(--accento)]" aria-hidden="true" />
            Cronologia
          </h2>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-[var(--secondario)]">
              <Trash2 size={16} aria-hidden="true" />
              Svuota
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-8 text-center shadow-[var(--elevazione-1)]">
            <Clock size={48} className="mx-auto mb-4 text-[var(--accento)]" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[var(--testo)] mb-2">Nessuna preparazione registrata</h3>
            <p className="text-sm text-[var(--secondario)] mb-4">
              Quando premi «La faccio!» su una ricetta, qui troverai la cronologia con data e ora esatte.
            </p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Vai all'elenco ricette
            </Button>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Cronologia preparazioni">
            {entries.map((entry: HistoryEntry) => (
              <li key={entry.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/recipe/${entry.ricetta_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/recipe/${entry.ricetta_id}`)
                    }
                  }}
                  className="card w-full text-left bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 shadow-[var(--elevazione-1)] flex items-center gap-3 cursor-pointer transition-[transform,border-color,box-shadow] duration-150 ease-out hover:border-[var(--accento)] hover:shadow-[var(--elevazione-2)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--testo)] truncate">{entry.titolo}</p>
                    <p className="text-sm text-[var(--secondario)] mt-0.5">{formatHistoryDate(entry.data)}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {categoriaLabel(entry.categoria) && (
                        <Badge variant="tag">{categoriaLabel(entry.categoria)}</Badge>
                      )}
                      {moodLabel(entry.mood) && (
                        <Badge variant="mood">{moodLabel(entry.mood)}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      aria-label={`Elimina voce: ${entry.titolo}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(entry.id)
                      }}
                      className="touch-target p-2 rounded-xl text-[var(--secondario)] hover:bg-[var(--bordo)] hover:text-red-600 active:scale-[0.95] transition-[transform,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                    <ChevronRight size={20} className="text-[var(--secondario)]" aria-hidden="true" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BackToTop />
    </div>
  )
}
