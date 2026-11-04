/**
 * Pagina Roulette - slot machine di titoli (stile selettore a scorrimento).
 * Logica pura in src/utils/roulette.ts, "riduci animazioni" in src/utils/motion.ts.
 * NOTA: Header e Mood Bar sono nel Layout component.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shuffle, Clock, Users, Tag, AlertCircle, Check, RotateCcw } from 'lucide-react'
import { getRecipes, incrementRecipeMade } from '../lib/supabase'
import { CATEGORIE, CATEGORIE_LABELS, MOOD_LABELS, STATO_LABELS } from '../lib/config'
import { useMood } from '../contexts/MoodContext'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { addHistoryEntry } from '../lib/history'
import { useReducedMotion } from '../utils/motion'
import {
  buildPool,
  emptyPoolReason,
  pickWinner,
  buildStrip,
  DEFAULT_ROULETTE_FILTERS,
  type RouletteFilters,
  type RouletteRecipe,
  type EmptyPoolReason,
} from '../utils/roulette'

const ROW_H = 56
const VISIBLE_ROWS = 5
const CENTER_IDX = Math.floor(VISIBLE_ROWS / 2)
const SPIN_MS = 2200
const FADE_OUT_MS = 200

const REASON_TEXT: Record<Exclude<EmptyPoolReason, null>, string> = {
  mood: 'Nessuna ricetta in questo mood',
  categoria: 'La categoria selezionata non ha ricette in questo mood',
  tempo: 'Nessuna ricetta con un tempo entro il massimo indicato',
  recenti: 'Tutte le ricette del pool sono state fatte negli ultimi 14 giorni',
}

const formatAutore = (v: string | null) => v || 'Autore non indicato'
const formatPorzioni = (v: number | null, u: string | null) =>
  v == null || v === 0 ? 'Porzioni non indicate' : `${v} ${u || 'porzioni'}`
const formatTempo = (v: number | null) =>
  v == null || v === 0 ? 'Tempo non indicato' : `${v} min`

export function Roulette() {
  const navigate = useNavigate()
  const { mood, setMood } = useMood()
  const { user } = useAuth()
  const reducedMotion = useReducedMotion()

  const [recipes, setRecipes] = useState<RouletteRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<RouletteFilters>(DEFAULT_ROULETTE_FILTERS)
  const [spinning, setSpinning] = useState(false)
  const [stripTitles, setStripTitles] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [winner, setWinner] = useState<RouletteRecipe | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [madeLoading, setMadeLoading] = useState(false)
  const [winnerFading, setWinnerFading] = useState(false)

  const spinTimer = useRef<number | null>(null)

  // Carica le ricette una volta sola
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRecipes()
      .then(data => {
        if (!cancelled) setRecipes((data ?? []) as unknown as RouletteRecipe[])
      })
      .catch(err => {
        console.error('Errore caricamento ricette:', err)
        if (!cancelled) setError('Errore nel caricamento delle ricette')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => {
    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current)
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  // Reset winner when mood changes - fade out animation
  useEffect(() => {
    if (winner && !spinning) {
      setWinnerFading(true)
      const timer = window.setTimeout(() => {
        setWinner(null)
        setWinnerFading(false)
        setAnnouncement('')
        setStripTitles([])
        setOffset(0)
      }, FADE_OUT_MS)
      return () => window.clearTimeout(timer)
    }
  }, [mood])

  const pool = useMemo(() => buildPool(recipes, filters, mood), [recipes, filters, mood])
  const reason = useMemo(
    () => (pool.length === 0 ? emptyPoolReason(recipes, filters, mood) : null),
    [pool.length, recipes, filters, mood]
  )

  // Anteprima iniziale: 5 righe dal pool (ripetute se il pool è piccolo)
  const preview = useMemo(() => {
    if (pool.length === 0) return []
    const rows: RouletteRecipe[] = []
    let i = 0
    while (rows.length < VISIBLE_ROWS) {
      rows.push(pool[i % pool.length])
      i++
    }
    return rows
  }, [pool])

  const spin = () => {
    if (spinning || pool.length === 0) return
    const w = pickWinner(pool, winner?.id)

    // Riduci animazioni o pool di 1: risultato subito al centro
    if (reducedMotion || pool.length === 1) {
      setWinner(w)
      setStripTitles([])
      setOffset(0)
      setAnnouncement(`Ricetta estratta: ${w.titolo}`)
      return
    }

    const titles = buildStrip(pool, w)
    setWinner(null)
    setAnnouncement('')
    setSpinning(true)
    setStripTitles(titles)
    setOffset(0)

    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current)
    // Doppio rAF: il browser applica la posizione iniziale prima della transizione
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffset((titles.length - 1 - CENTER_IDX) * ROW_H)
      })
    })
    spinTimer.current = window.setTimeout(() => {
      setSpinning(false)
      setWinner(w)
      setAnnouncement(`Ricetta estratta: ${w.titolo}`)
      spinTimer.current = null
    }, SPIN_MS)
  }

  const resetFilters = () => {
    setFilters(DEFAULT_ROULETTE_FILTERS)
    setWinner(null)
    setStripTitles([])
    setOffset(0)
    setAnnouncement('')
  }

  const handleMade = async () => {
    if (!user || !winner || madeLoading) return
    setMadeLoading(true)
    try {
      await incrementRecipeMade(winner.id)
      const nowIso = new Date().toISOString()
      // Aggiorna lo stato locale: il filtro "ultimi 14 giorni" ha effetto subito
      setRecipes(prev =>
        prev.map(r =>
          r.id === winner.id
            ? { ...r, ultima_volta: nowIso }
            : r
        )
      )
      addHistoryEntry({
        ricetta_id: winner.id,
        titolo: winner.titolo,
        mood: winner.mood,
        categoria: winner.categoria,
      })
      setToast(`«${winner.titolo}» segnata come fatta`)
    } catch (err) {
      console.error('Errore aggiornamento contatore:', err)
      setToast('Errore: impossibile aggiornare il contatore (controlla i permessi)')
    } finally {
      setMadeLoading(false)
    }
  }

  return (
    <div className="page-container roulette-page">
      <main className="roulette-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col gap-4">
        {/* Toast */}
        {toast && (
          <div className="fixed top-16 left-4 right-4 max-w-[720px] mx-auto z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-[var(--accento)] text-[var(--accento-testo)] px-4 py-3 rounded-xl shadow-lg text-sm">
              {toast}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Shuffle size={24} className="text-[var(--accento)]" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-[var(--testo)] m-0">Roulette</h1>
        </div>

        {loading && (
          <div className="loading-skeleton space-y-4">
            <div className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
              <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
              <div className="h-4 w-1/2 bg-[var(--bordo)] rounded" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="empty-state card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
            <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">{error}</h2>
            <Button variant="primary" onClick={() => window.location.reload()}>Riprova</Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Filtri */}
            <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 shadow-[var(--elevazione-1)]">
              <h2 className="text-lg font-semibold text-[var(--testo)] mb-3">Filtri</h2>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="filter-group flex-1">
                  <label htmlFor="roulette-categoria" className="block text-sm font-medium text-[var(--testo)] mb-1">Categoria</label>
                  <select
                    id="roulette-categoria"
                    value={filters.categoria}
                    onChange={e => setFilters(f => ({ ...f, categoria: e.target.value }))}
                    className="form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none"
                  >
                    <option value="">Tutte</option>
                    {CATEGORIE.map(cat => (
                      <option key={cat} value={cat}>{CATEGORIE_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group flex-1">
                  <label htmlFor="roulette-tempo" className="block text-sm font-medium text-[var(--testo)] mb-1">Tempo max (min)</label>
                  <input
                    id="roulette-tempo"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Es. 30"
                    value={filters.tempoMax ?? ''}
                    onChange={e => {
                      const v = e.target.value
                      const parsed = parseInt(v, 10)
                      setFilters(f => ({
                        ...f,
                        tempoMax: v === '' || isNaN(parsed) || parsed < 1 ? null : parsed,
                      }))
                    }}
                    className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                  />
                </div>
                <label className="checkbox-label flex items-center gap-2 cursor-pointer text-sm text-[var(--testo)] pb-2">
                  <input
                    type="checkbox"
                    checked={filters.escludiRecenti}
                    onChange={e => setFilters(f => ({ ...f, escludiRecenti: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--bordo)] text-[var(--accento)] focus:ring-2 focus:ring-[var(--accento)]"
                  />
                  Escludi fatte negli ultimi 14 giorni
                </label>
              </div>
            </section>

            {/* Pool vuoto */}
            {pool.length === 0 && reason && (
              <div className="empty-state card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center shadow-[var(--elevazione-1)]">
                <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Nessuna ricetta trovata</h2>
                <p className="text-[var(--secondario)] mb-4">
                  {reason === 'mood'
                    ? `Nessuna ricetta nel mood «${MOOD_LABELS[mood]}».`
                    : REASON_TEXT[reason]}
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {reason === 'mood' && (
                    <Button variant="primary" onClick={() => setMood('tutti')}>
                      <RotateCcw size={16} /> Mostra tutti i mood
                    </Button>
                  )}
                  <Button variant="secondary" onClick={resetFilters}>Azzera filtri</Button>
                </div>
              </div>
            )}

            {/* Slot machine */}
            {pool.length > 0 && (
              <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 shadow-[var(--elevazione-1)] flex flex-col items-center gap-4">
                <div
                  className="slot-window relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--card-bordo)] bg-[var(--sfondo)]"
                  style={{ height: VISIBLE_ROWS * ROW_H }}
                  aria-hidden={spinning}
                >
                  {/* Evidenziazione riga centrale */}
                  <div
                    className="slot-highlight"
                    style={{ top: CENTER_IDX * ROW_H, height: ROW_H }}
                    aria-hidden="true"
                  />

                  {spinning ? (
                    <div
                      className="slot-strip"
                      style={{
                        transform: `translateY(${-offset}px)`,
                        transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)`,
                      }}
                    >
                      {stripTitles.map((t, i) => (
                        <div key={i} className="slot-row break-words hyphens-auto" style={{ height: ROW_H }}><span className="text-wrap">{t}</span></div>
                      ))}
                    </div>
                  ) : winner ? (
                    <div className="absolute inset-0 z-[1] flex items-center justify-center">
                      <button
                        type="button"
                        className="slot-row dist-0 w-full px-4 cursor-pointer break-words hyphens-auto"
                        style={{ height: ROW_H }}
                        onClick={() => navigate(`/recipe/${winner.id}`)}
                        aria-label={`Apri ricetta: ${winner.titolo}`}
                      >
                        <span className="text-base md:text-lg font-bold text-wrap break-words">{winner.titolo}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative z-[1]">
                      {preview.map((r, i) => (
                        <div
                          key={`${r.id}-${i}`}
                          className={`slot-row dist-${Math.min(Math.abs(i - CENTER_IDX), 2)} break-words hyphens-auto`}
                          style={{ height: ROW_H }}
                        >
                          <span className="text-wrap">{r.titolo}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sfumature alto/basso */}
                  <div className="slot-fade slot-fade-top" aria-hidden="true" />
                  <div className="slot-fade slot-fade-bottom" aria-hidden="true" />
                </div>

                <p className="sr-only" aria-live="polite">{announcement}</p>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={spin}
                  disabled={spinning || pool.length === 0}
                  isLoading={spinning}
                  className="gap-2"
                >
                  {!spinning && <Shuffle size={20} aria-hidden="true" />}
                  {spinning ? 'Girando…' : winner ? 'Rigira' : 'Gira'}
                </Button>
              </section>
            )}

            {/* Risultato */}
            {winner && !spinning && (
              <section className={`card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 shadow-[var(--elevazione-2)] w-full max-w-2xl mx-auto transition-all duration-200 ease-out ${winnerFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-xl md:text-2xl font-semibold text-[var(--testo)] m-0 break-words hyphens-auto text-wrap">{winner.titolo}</h2>
                  {winner.stato === 'da_completare' && (
                    <Badge variant="stato" className="flex-shrink-0">{STATO_LABELS.da_completare}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {winner.categoria && (
                    <Badge variant="tag">{CATEGORIE_LABELS[winner.categoria as keyof typeof CATEGORIE_LABELS] ?? winner.categoria}</Badge>
                  )}
                  {winner.mood && (
                    <Badge variant="mood">{MOOD_LABELS[winner.mood as keyof typeof MOOD_LABELS] ?? winner.mood}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="info-box flex flex-col items-center justify-center p-3 bg-[var(--sfondo)] rounded-xl min-h-[72px] border border-[var(--card-bordo)]">
                    <Tag size={20} className="text-[var(--accento)] mb-1" aria-hidden="true" />
                    <p className="text-[11px] text-[var(--secondario)] uppercase tracking-wider">Autore</p>
                    <p className="text-sm font-medium text-[var(--testo)] text-center break-words">{formatAutore(winner.autore)}</p>
                  </div>
                  <div className="info-box flex flex-col items-center justify-center p-3 bg-[var(--sfondo)] rounded-xl min-h-[72px] border border-[var(--card-bordo)]">
                    <Users size={20} className="text-[var(--accento)] mb-1" aria-hidden="true" />
                    <p className="text-[11px] text-[var(--secondario)] uppercase tracking-wider">Porzioni</p>
                    <p className="text-sm font-medium text-[var(--testo)] text-center">{formatPorzioni(winner.porzioni, winner.porzioni_unita)}</p>
                  </div>
                  <div className="info-box flex flex-col items-center justify-center p-3 bg-[var(--sfondo)] rounded-xl min-h-[72px] border border-[var(--card-bordo)]">
                    <Clock size={20} className="text-[var(--accento)] mb-1" aria-hidden="true" />
                    <p className="text-[11px] text-[var(--secondario)] uppercase tracking-wider">Tempo</p>
                    <p className="text-sm font-medium text-[var(--testo)] text-center">{formatTempo(winner.tempo_minuti)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link to={`/recipe/${winner.id}`}>
                    <Button variant="primary" className="w-full">Apri ricetta</Button>
                  </Link>
                  {user && (
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      onClick={handleMade}
                      isLoading={madeLoading}
                      disabled={madeLoading}
                    >
                      {!madeLoading && <Check size={18} aria-hidden="true" />}
                      La facciamo!
                    </Button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
