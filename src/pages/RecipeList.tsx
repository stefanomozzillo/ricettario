/**
 * Pagina Elenco Ricette con ricerca, filtri e cards
 * Usa componenti condivisi: RecipeCard, Button, Badge
 * NOTA: Header e Mood Bar ora sono nel Layout component
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, AlertCircle, RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { getRecipes, getAllAuthors, type SortOption } from '../lib/supabase'
import { CATEGORIE, CATEGORIE_LABELS, ALL_TAGS, TAG_LABELS, MOOD_LABELS, TEMPO_VELOCE_MINUTI, DIFFICOLTA, DIFFICOLTA_LABELS } from '../lib/config'
import { useMood } from '../contexts/MoodContext'
import { RecipeCard } from '../components/RecipeCard'
import { Button } from '../components/Button'
import { BottomNav } from '../components/BottomNav'
import { BackToTop } from '../components/BackToTop'

interface Recipe {
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
  created_at: string
  volte_fatta: number | null
}

interface FiltersState {
  search: string
  sort: SortOption
  categoria: string
  tags: string[]
  veloce: boolean
  completamento: 'all' | 'completa' | 'da_completare'
  autore: string
  difficolta: string
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'most_recent', label: 'Più recenti' },
  { value: 'tempo_asc', label: 'Tempo: meno tempo' },
  { value: 'tempo_desc', label: 'Tempo: più tempo' },
  { value: 'title_asc', label: 'A-Z' },
  { value: 'title_desc', label: 'Z-A' },
  { value: 'most_cooked', label: 'Più cucinate' },
]

const COMPLETAMENTO_OPTIONS = [
  { value: 'all', label: 'Tutte' },
  { value: 'completa', label: 'Complete' },
  { value: 'da_completare', label: 'Da completare' },
]

export function RecipeList() {
  const navigate = useNavigate()
  const { mood, setMood } = useMood()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authors, setAuthors] = useState<string[]>([])
  const [authorsLoading, setAuthorsLoading] = useState(true)
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    sort: 'most_recent',
    categoria: '',
    tags: [],
    veloce: false,
    completamento: 'all',
    autore: '',
    difficolta: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPanelHeight, setFilterPanelHeight] = useState(0)

  // Debounce ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Carica autori per dropdown
  useEffect(() => {
    let mounted = true
    const loadAuthors = async () => {
      try {
        const data = await getAllAuthors()
        if (mounted) setAuthors(data)
      } catch (err) {
        console.error('Errore caricamento autori:', err)
      } finally {
        if (mounted) setAuthorsLoading(false)
      }
    }
    loadAuthors()
    return () => { mounted = false }
  }, [])

  // Carica ricette con filtri
  const loadRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipes({
        mood: mood !== 'tutti' ? mood : undefined,
        search: debouncedSearch || undefined,
        category: filters.categoria || undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        stato: filters.completamento !== 'all' ? filters.completamento : undefined,
        autore: filters.autore || undefined,
        difficolta: filters.difficolta || undefined,
        sort: filters.sort,
      })
      setRecipes(data || [])
    } catch (err) {
      setError('Errore nel caricamento delle ricette')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [mood, debouncedSearch, filters.categoria, filters.tags, filters.completamento, filters.autore, filters.difficolta, filters.sort])

  const finalRecipes = useMemo(() => {
    let result = [...recipes]
    if (filters.veloce) {
      result = result.filter(r => r.tempo_minuti !== null && r.tempo_minuti <= TEMPO_VELOCE_MINUTI)
    }
    // Riordino client-side con nulls-last per i campi nullable
    // (il DB mette i null prima in ASC, dopo in DESC: li riporto sempre in fondo)
    switch (filters.sort) {
      case 'tempo_asc':
        result.sort((a, b) => {
          if (a.tempo_minuti === null) return 1
          if (b.tempo_minuti === null) return -1
          return a.tempo_minuti - b.tempo_minuti
        })
        break
      case 'tempo_desc':
        result.sort((a, b) => {
          if (a.tempo_minuti === null) return 1
          if (b.tempo_minuti === null) return -1
          return b.tempo_minuti - a.tempo_minuti
        })
        break
      case 'most_cooked':
        result.sort((a, b) => {
          const av = a.volte_fatta ?? 0
          const bv = b.volte_fatta ?? 0
          return bv - av
        })
        break
      // title_asc, title_desc, most_recent sono già ordinati lato server
    }
    return result
  }, [recipes, filters.veloce, filters.sort])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleFilterChange = (key: keyof FiltersState, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      sort: 'most_recent',
      categoria: '',
      tags: [],
      veloce: false,
      completamento: 'all',
      autore: '',
      difficolta: '',
    })
    setMood('tutti')
  }

  const filterCount =
    (filters.categoria ? 1 : 0) +
    filters.tags.length +
    (filters.veloce ? 1 : 0) +
    (filters.completamento !== 'all' ? 1 : 0) +
    (filters.autore ? 1 : 0) +
    (filters.difficolta ? 1 : 0)
  const hasActiveFilters = filterCount > 0 || mood !== 'tutti' || filters.sort !== 'most_recent'

  // Misura altezza pannello filtri per animazione
  useEffect(() => {
    if (showFilters) {
      const panel = document.querySelector('.filters-panel')
      if (panel) setFilterPanelHeight(panel.scrollHeight)
    }
  }, [showFilters, filters])

  if (loading) {
    return (
      <div className="page-container min-h-screen pb-24">
        <div className="max-w-[720px] mx-auto px-4">
          <div className="loading-skeleton space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
                <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
                <div className="h-4 w-1/2 bg-[var(--bordo)] rounded mb-3" />
                <div className="h-4 w-1/3 bg-[var(--bordo)] rounded mb-3" />
                <div className="h-4 w-1/4 bg-[var(--bordo)] rounded" />
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container min-h-screen pb-24 flex flex-col items-center justify-center px-4">
        <div className="error-state card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center w-full max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
          <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Errore</h2>
          <p className="text-[var(--secondario)] mb-6">{error}</p>
          <Button variant="primary" onClick={loadRecipes}>Riprova</Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="page-container min-h-screen pb-24">
      {/* Header title + filters toggle - senza Header component */}
      <div className="list-header max-w-[720px] mx-auto px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-[var(--testo)]">Ricette</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-label={`Filtri${hasActiveFilters ? ` (${filterCount + (mood !== 'tutti' ? 1 : 0) + (filters.sort !== 'most_recent' ? 1 : 0)} attivi)` : ''}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full min-h-[40px] min-w-[40px]"
            >
              <SlidersHorizontal size={18} className={clsx(showFilters && 'text-[var(--accento)]')} />
              <span className="text-sm font-medium hidden sm:inline">{showFilters ? 'Chiudi filtri' : 'Filtri'}</span>
              {filterCount + (mood !== 'tutti' ? 1 : 0) + (filters.sort !== 'most_recent' ? 1 : 0) > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs bg-[var(--accento)] text-[var(--accento-testo)]">
                  {filterCount + (mood !== 'tutti' ? 1 : 0) + (filters.sort !== 'most_recent' ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div
            className="filters-panel bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-in slide-in-from-top-2 duration-200 mt-4 overflow-hidden"
            style={{ maxHeight: showFilters ? filterPanelHeight || 'none' : 0 }}
          >
            {/* Ricerca */}
            <div className="filter-group mb-4">
              <label htmlFor="search" className="block text-sm font-medium text-[var(--testo)] mb-2">Cerca</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)]" aria-hidden="true" />
                <input
                  type="search"
                  id="search"
                  placeholder="Cerca per titolo..."
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 min-h-[44px] text-base"
                />
                {filters.search && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] hover:text-[var(--testo)] transition-colors p-2 min-w-[44px] min-h-[44px]"
                    onClick={() => handleFilterChange('search', '')}
                    aria-label="Cancella ricerca"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Ordinamento */}
            <div className="filter-group mb-4">
              <label htmlFor="sort" className="block text-sm font-medium text-[var(--testo)] mb-2">Ordina per</label>
              <div className="relative">
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none" aria-hidden="true" />
                <select
                  id="sort"
                  value={filters.sort}
                  onChange={e => handleFilterChange('sort', e.target.value as SortOption)}
                  className="w-full pl-3 pr-10 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none min-h-[44px] text-base"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categoria */}
            <div className="filter-group mb-4">
              <label htmlFor="categoria" className="block text-sm font-medium text-[var(--testo)] mb-2">Categoria</label>
              <div className="relative">
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none" aria-hidden="true" />
                <select
                  id="categoria"
                  value={filters.categoria}
                  onChange={e => handleFilterChange('categoria', e.target.value)}
                  className="w-full pl-3 pr-10 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none min-h-[44px] text-base"
                >
                  <option value="">Tutte le categorie</option>
                  {CATEGORIE.map(cat => (
                    <option key={cat} value={cat}>{CATEGORIE_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficoltà */}
            <div className="filter-group mb-4">
              <label htmlFor="difficolta" className="block text-sm font-medium text-[var(--testo)] mb-2">Difficoltà</label>
              <div className="relative">
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none" aria-hidden="true" />
                <select
                  id="difficolta"
                  value={filters.difficolta}
                  onChange={e => handleFilterChange('difficolta', e.target.value)}
                  className="w-full pl-3 pr-10 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none min-h-[44px] text-base"
                >
                  <option value="">Tutte le difficoltà</option>
                  {DIFFICOLTA.map(diff => (
                    <option key={diff} value={diff}>{DIFFICOLTA_LABELS[diff]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Completamento - Radio buttons */}
            <div className="filter-group mb-4">
              <label className="block text-sm font-medium text-[var(--testo)] mb-2">Completamento</label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stato completamento">
                {COMPLETAMENTO_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={clsx(
                      'radio-label flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-150 cursor-pointer min-h-[44px]',
                      filters.completamento === opt.value
                        ? 'border-[var(--accento)] bg-[var(--accento)]/10 text-[var(--accento)]'
                        : 'border-[var(--bordo)] text-[var(--secondario)] hover:border-[var(--accento)]/50 hover:bg-[var(--accento)]/5'
                    )}
                  >
                    <input
                      type="radio"
                      name="completamento"
                      value={opt.value}
                      checked={filters.completamento === opt.value}
                      onChange={e => handleFilterChange('completamento', e.target.value as 'all' | 'completa' | 'da_completare')}
                      className="w-4 h-4 text-[var(--accento)] border-[var(--bordo)] focus:ring-2 focus:ring-[var(--accento)] focus:ring-offset-2 focus:ring-offset-[var(--sfondo)]"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Autore - Dropdown dinamico */}
            <div className="filter-group mb-4">
              <label htmlFor="autore" className="block text-sm font-medium text-[var(--testo)] mb-2">Autore</label>
              <div className="relative">
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--secondario)] pointer-events-none" aria-hidden="true" />
                <select
                  id="autore"
                  value={filters.autore}
                  onChange={e => handleFilterChange('autore', e.target.value)}
                  disabled={authorsLoading}
                  className="w-full pl-3 pr-10 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none min-h-[44px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Tutti gli autori</option>
                  {authorsLoading ? (
                    <option value="" disabled>Caricamento...</option>
                  ) : (
                    authors.map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Tag */}
            <div className="filter-group mb-4">
              <label className="block text-sm font-medium text-[var(--testo)] mb-2">Tag</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={clsx(
                      'px-3 py-2 rounded-full text-sm font-medium transition-all duration-150 min-h-[44px] min-w-[44px]',
                      filters.tags.includes(tag)
                        ? 'bg-[var(--accento)] text-[var(--accento-testo)]'
                        : 'bg-[var(--bordo)] text-[var(--secondario)] hover:bg-[var(--accento)]/10'
                    )}
                    onClick={() => handleFilterChange('tags',
                      filters.tags.includes(tag)
                        ? filters.tags.filter(t => t !== tag)
                        : [...filters.tags, tag]
                    )}
                  >
                    {TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox veloce */}
            <div className="filter-group mb-4">
              <label className="checkbox-label flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={filters.veloce}
                  onChange={e => handleFilterChange('veloce', e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--bordo)] text-[var(--accento)] focus:ring-2 focus:ring-[var(--accento)] focus:ring-offset-2 focus:ring-offset-[var(--sfondo)] transition-colors"
                />
                <span className="text-[var(--testo)]">Veloce (meno di {TEMPO_VELOCE_MINUTI} min)</span>
              </label>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" className="w-full min-h-[44px]" onClick={clearFilters}>
                <X size={16} /> Cancella filtri
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lista ricette */}
      <main className="max-w-[720px] mx-auto px-4 pt-6 pb-24">
        {finalRecipes.length === 0 ? (
          <div className="empty-state card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center animate-in fade-in duration-300">
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
            {mood !== 'tutti' ? (
              <>
                <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Nessuna ricetta in questo mood</h2>
                <p className="text-[var(--secondario)] mb-6">
                  Nessuna ricetta trovata per <strong>{MOOD_LABELS[mood]}</strong>.
                </p>
                <Button variant="primary" onClick={() => setMood('tutti')}>
                  <RotateCcw size={16} /> Mostra tutti i mood
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">Nessuna ricetta trovata</h2>
                <p className="text-[var(--secondario)] mb-6">
                  {hasActiveFilters ? 'Prova a modificare i filtri o la ricerca' : 'Inizia aggiungendo la tua prima ricetta'}
                </p>
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={clearFilters} className="min-h-[44px]">
                    <X size={16} /> Cancella filtri
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="recipes-grid grid grid-cols-1 sm:grid-cols-2 gap-4" role="list">
            {finalRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => navigate(`/recipe/${recipe.id}`)} />
            ))}
          </div>
        )}
      </main>

      <BackToTop />
      <BottomNav />
    </div>
  )
}