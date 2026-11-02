/**
 * Pagina Elenco Ricette con ricerca, filtri e cards
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, X, Clock, AlertCircle, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { getRecipes } from '../lib/supabase'
import { CATEGORIE, CATEGORIE_LABELS, ALL_TAGS, TAG_LABELS, MOOD_LABELS, TEMPO_VELOCE_MINUTI, STATO_LABELS } from '../lib/config'
import type { Mood } from '../lib/config'
import { useMood } from '../contexts/MoodContext'

interface Recipe {
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
  created_at: string
}

interface FiltersState {
  search: string
  categoria: string
  tags: string[]
  veloce: boolean
  daCompletare: boolean
}

export function RecipeList() {
  const navigate = useNavigate()
  const { mood, setMood } = useMood()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    categoria: '',
    tags: [],
    veloce: false,
    daCompletare: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])

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
        stato: filters.daCompletare ? 'da_completare' : undefined,
      })
      setRecipes(data || [])
    } catch (err) {
      setError('Errore nel caricamento delle ricette')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [mood, debouncedSearch, filters.categoria, filters.tags, filters.daCompletare])

  // Applica filtro mood lato client (perché mood è nel context)
  const filteredRecipes = useMemo(() => {
    return recipes
  }, [recipes])

  // Filtro veloce (< 30 min) lato client
  const finalRecipes = useMemo(() => {
    let result = filteredRecipes
    if (filters.veloce) {
      result = result.filter(r => r.tempo_minuti !== null && r.tempo_minuti <= TEMPO_VELOCE_MINUTI)
    }
    return result
  }, [filteredRecipes, filters.veloce])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleFilterChange = (key: keyof FiltersState, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ search: '', categoria: '', tags: [], veloce: false, daCompletare: false })
    setMood('tutti')
  }

  const hasActiveFilters = filters.categoria || filters.tags.length > 0 || filters.veloce || filters.daCompletare || mood !== 'tutti'

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state card">
          <AlertCircle size={48} className="error-icon" />
          <h2>Errore</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={loadRecipes}>Riprova</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header con titolo e filtri */}
      <header className="list-header">
        <div className="header-content">
          <h1>Ricette</h1>
          <button
            type="button"
            className={clsx('filter-toggle', showFilters && 'active')}
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
          >
            <Filter size={20} />
            <span>Filtri</span>
            {hasActiveFilters && <span className="filter-badge">{filters.tags.length + (filters.categoria ? 1 : 0) + (filters.veloce ? 1 : 0) + (filters.daCompletare ? 1 : 0) + (mood !== 'tutti' ? 1 : 0)}</span>}
          </button>
        </div>

        {/* Pannello filtri */}
        {showFilters && (
          <div className="filters-panel card">
            {/* Ricerca */}
            <div className="filter-group">
              <label htmlFor="search" className="sr-only">Cerca ricette</label>
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="search"
                  id="search"
                  placeholder="Cerca per titolo..."
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="search-input"
                />
                {filters.search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => handleFilterChange('search', '')}
                    aria-label="Cancella ricerca"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Categoria */}
            <div className="filter-group">
              <label htmlFor="categoria">Categoria</label>
              <select
                id="categoria"
                value={filters.categoria}
                onChange={e => handleFilterChange('categoria', e.target.value)}
                className="filter-select"
              >
                <option value="">Tutte le categorie</option>
                {CATEGORIE.map(cat => (
                  <option key={cat} value={cat}>{CATEGORIE_LABELS[cat]}</option>
                ))}
              </select>
            </div>

            {/* Tag */}
            <div className="filter-group">
              <label>Tag</label>
              <div className="tag-filters">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={clsx('tag-filter', filters.tags.includes(tag) && 'active')}
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

            {/* Checkbox veloce e da completare */}
            <div className="filter-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.veloce}
                  onChange={e => handleFilterChange('veloce', e.target.checked)}
                />
                <span>{'Veloce (< ' + TEMPO_VELOCE_MINUTI + ' min)'}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.daCompletare}
                  onChange={e => handleFilterChange('daCompletare', e.target.checked)}
                />
                <span>Da completare</span>
              </label>
            </div>

            {hasActiveFilters && (
              <button type="button" className="btn-secondary clear-filters" onClick={clearFilters}>
                <X size={16} /> Cancella filtri
              </button>
            )}
          </div>
        )}
      </header>

      {/* Lista ricette */}
      <main className="recipes-list">
        {finalRecipes.length === 0 ? (
          <div className="empty-state card">
            <AlertCircle size={48} className="empty-icon" />
            {mood !== 'tutti' ? (
              <>
                <h2>Nessuna ricetta in questo mood</h2>
                <p>Nessuna ricetta trovata per <strong>{MOOD_LABELS[mood]}</strong>.</p>
                <button type="button" className="btn-primary" onClick={() => setMood('tutti')}>
                  <RotateCcw size={16} /> Mostra tutti i mood
                </button>
              </>
            ) : (
              <>
                <h2>Nessuna ricetta trovata</h2>
                <p>{hasActiveFilters ? 'Prova a modificare i filtri' : 'Inizia aggiungendo la tua prima ricetta'}</p>
                {hasActiveFilters && (
                  <button type="button" className="btn-secondary" onClick={clearFilters}>
                    <X size={16} /> Cancella filtri
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="recipes-grid" role="list">
            {finalRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => navigate(`/recipe/${recipe.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Card singola ricetta
 */
interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const moodLabel = recipe.mood ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const categoriaLabel = recipe.categoria ? CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] : '—'
  const tags = recipe.tags || []
  const firstTags = tags.slice(0, 2)
  const remainingTags = tags.length - 2

  return (
    <article className="recipe-card card" onClick={onClick} role="listitem" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="card-header">
        <h3 className="recipe-title">{recipe.titolo}</h3>
        {recipe.stato === 'da_completare' && (
          <span className="badge badge-warning">{STATO_LABELS.da_completare}</span>
        )}
      </div>

      {recipe.autore && (
        <p className="recipe-autore">di {recipe.autore}</p>
      )}

      <div className="recipe-meta">
        <span className="meta-item">
          <span className="meta-label">Mood:</span> {moodLabel}
        </span>
        <span className="meta-item">
          <span className="meta-label">Categoria:</span> {categoriaLabel}
        </span>
      </div>

      {firstTags.length > 0 && (
        <div className="recipe-tags">
          {firstTags.map(tag => (
            <span key={tag} className="badge badge-tag">{TAG_LABELS[tag as keyof typeof TAG_LABELS] || tag}</span>
          ))}
          {remainingTags > 0 && (
            <span className="badge badge-tag more">+{remainingTags}</span>
          )}
        </div>
      )}

      <div className="recipe-footer">
        {recipe.tempo_minuti && (
          <span className="meta-item">
            <Clock size={14} /> {recipe.tempo_minuti} min
          </span>
        )}
        {recipe.porzioni && (
          <span className="meta-item">
            {recipe.porzioni} {recipe.porzioni_unita || 'porzioni'}
          </span>
        )}
        {!recipe.tempo_minuti && (
          <span className="meta-item no-time">Tempo non indicato</span>
        )}
      </div>
    </article>
  )
}