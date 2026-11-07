/**
 * Pagina Cosa ho in casa - autocomplete ingredienti dal DB → chip persistenti,
 * basi da ignorare modificabili qui, calcolo match in src/utils/pantry.ts.
 * Rispetta il filtro mood (mood bar nel Layout).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Plus, Trash2, CheckCircle, AlertCircle, Search, X, RotateCcw, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import { DEFAULT_IGNORED_INGREDIENTS } from '../lib/config'
import { Button } from '../components/Button'
import { RecipeCard } from '../components/RecipeCard'
import { MOOD_LABELS } from '../lib/config'
import { aiSubstitutions, useAiAvailable } from '../lib/ai'
import { clsx } from 'clsx'
import {
  normalizeIngredientName,
  collectAllIngredients,
  computeMatches,
} from '../utils/pantry'

const STORAGE_KEY_PANTRY = 'ricettario-pantry-ingredients'
const STORAGE_KEY_IGNORED = 'ricettario-ignored-ingredients'

export function Pantry() {
  const navigate = useNavigate()
  const { mood, setMood } = useMood()
  const { user } = useAuth()

  // Ingredienti scelti dall'utente (persistiti)
  const [ingredients, setIngredients] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PANTRY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.filter(x => typeof x === 'string')
      }
    } catch {}
    return []
  })

  // Ingredienti base ignorati (persistiti)
  const [ignoredIngredients, setIgnoredIngredients] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IGNORED)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.filter(x => typeof x === 'string')
      }
    } catch {}
    return [...DEFAULT_IGNORED_INGREDIENTS]
  })

  const [newIgnoredInput, setNewIgnoredInput] = useState('')
  const [input, setInput] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // AI Sostituzioni
  const { available: aiAvailable } = useAiAvailable()
  const [substitutions, setSubstitutions] = useState<Record<string, Array<{ nome: string; nota: string }>>>({})
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Carica tutte le ricette una volta sola (per autocomplete + match)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('ricette')
          .select('*')
          .order('titolo', { ascending: true })
        if (cancelled) return
        if (error) throw error
        setRecipes(data ?? [])
      } catch (err) {
        if (cancelled) return
        console.error('Errore caricamento ricette:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Persisti ingredienti
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PANTRY, JSON.stringify(ingredients))
    } catch (err) {
      console.error('Errore salvataggio ingredienti:', err)
    }
  }, [ingredients])

  // Persisti ingredienti base ignorati
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IGNORED, JSON.stringify(ignoredIngredients))
    } catch (err) {
      console.error('Errore salvataggio basi:', err)
    }
  }, [ignoredIngredients])

  // Nomi unici normalizzati di TUTTI gli ingredienti nel DB
  const allIngredientNames = useMemo(
    () => collectAllIngredients(recipes),
    [recipes]
  )

  // Suggerimenti filtrati
  const suggestions = useMemo(() => {
    const q = normalizeIngredientName(input)
    if (!q) return []
    return allIngredientNames
      .filter(n => n.includes(q) && !ingredients.includes(n))
      .slice(0, 8)
  }, [input, allIngredientNames, ingredients])

  // Calcolo match (utils puro)
  const results = useMemo(
    () => computeMatches(recipes, ingredients, ignoredIngredients, mood),
    [recipes, ingredients, ignoredIngredients, mood]
  )

  // Se non ci sono ricette complete nel mood selezionato
  const moodEmpty = useMemo(
    () => mood !== 'tutti' && !recipes.some(r => r.stato === 'completa' && r.mood === mood),
    [recipes, mood]
  )

  // Debug: conta ricette complete per mood
  const completeRecipesCount = useMemo(
    () => recipes.filter(r => r.stato === 'completa').length,
    [recipes]
  )
  const moodFilteredCount = useMemo(
    () => recipes.filter(r => r.stato === 'completa' && (mood === 'tutti' || r.mood === mood)).length,
    [recipes, mood]
  )

  // Toast auto-dismiss
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(t)
  }, [message])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
  }, [])

  // Handlers ingredienti utente
  const handleSelectIngredient = (name: string) => {
    const norm = normalizeIngredientName(name)
    if (norm && !ingredients.includes(norm)) {
      setIngredients(prev => [...prev, norm].sort((a, b) => a.localeCompare(b, 'it')))
    }
    setInput('')
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
    inputRef.current?.focus()
  }

  const handleAddTyped = () => {
    const norm = normalizeIngredientName(input)
    if (norm && !ingredients.includes(norm)) {
      setIngredients(prev => [...prev, norm].sort((a, b) => a.localeCompare(b, 'it')))
    }
    setInput('')
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
    inputRef.current?.focus()
  }

  const handleRemoveIngredient = (ing: string) => {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  const handleClearPantry = () => {
    if (window.confirm('Svuotare tutti gli ingredienti selezionati?')) {
      setIngredients([])
      showMessage('success', 'Ingredienti svuotati')
    }
  }

  // Tastiera autocomplete
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!suggestionsOpen) setSuggestionsOpen(true)
      if (suggestions.length > 0) {
        setActiveSuggestion(i => (i + 1) % suggestions.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setActiveSuggestion(i => (i - 1 + suggestions.length) % suggestions.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        handleSelectIngredient(suggestions[activeSuggestion])
      } else {
        handleAddTyped()
      }
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveSuggestion(-1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setSuggestionsOpen(true)
    setActiveSuggestion(-1)
  }

  const handleInputFocus = () => {
    if (input.trim()) setSuggestionsOpen(true)
  }

  const handleInputBlur = () => {
    // Delay per permettere click sul suggerimento
    window.setTimeout(() => setSuggestionsOpen(false), 150)
  }

  // Handlers ingredienti base ignorati
  const handleAddIgnored = () => {
    const norm = normalizeIngredientName(newIgnoredInput)
    if (!norm) return
    if (ignoredIngredients.includes(norm)) {
      showMessage('error', 'Già presente nella lista')
      return
    }
    setIgnoredIngredients(prev => [...prev, norm].sort((a, b) => a.localeCompare(b, 'it')))
    setNewIgnoredInput('')
    showMessage('success', 'Aggiunto agli ingredienti base ignorati')
  }

  const handleRemoveIgnored = (ingredient: string) => {
    setIgnoredIngredients(prev => prev.filter(i => i !== ingredient))
    showMessage('success', 'Rimosso dagli ingredienti base ignorati')
  }

  const handleResetIgnored = () => {
    if (window.confirm('Ripristinare la lista predefinita (sale, pepe, olio, acqua, zucchero)?')) {
      setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
      showMessage('success', 'Lista ripristinata')
    }
  }

  const handleIgnoredKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddIgnored()
    }
  }

  return (
    <div className="page-container pantry-page">
      <main className="pantry-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {/* Toast message */}
        {message && (
          <div className={`fixed top-16 left-4 right-4 max-w-[720px] mx-auto z-50 animate-in slide-in-from-top-2 duration-200`}>
            <div className={`flex items-center gap-3 p-4 rounded-xl border border-current/20 ${
              message.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span className="flex-1 text-sm">{message.text}</span>
              <Button variant="ghost" size="sm" onClick={() => setMessage(null)} aria-label="Chiudi">
                <X size={18} />
              </Button>
            </div>
          </div>
        )}

        {/* Sezione ingredienti disponibili */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="section-header flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)] m-0">Ingredienti disponibili</h2>
            {ingredients.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearPantry} className="gap-1.5 text-[var(--secondario)]">
                <Trash2 size={14} aria-hidden="true" />
                Svuota
              </Button>
            )}
          </div>

          <div className="add-ingredient flex gap-2 mb-4">
            <div className="autocomplete-wrapper relative flex-1">
              <Search size={18} className="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)]" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Aggiungi ingrediente (es. pomodori, pasta, uova...)"
                className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 pl-10"
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestionsOpen && suggestions.length > 0}
                aria-controls="pantry-suggestions"
                aria-autocomplete="list"
              />
              {suggestionsOpen && suggestions.length > 0 && (
                <ul id="pantry-suggestions" className="autocomplete-dropdown" role="listbox">
                  {suggestions.map((s, i) => (
                    <li key={s} role="option" aria-selected={i === activeSuggestion}>
                      <button
                        type="button"
                        className={clsx(
                          'autocomplete-option block w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--testo)] hover:bg-[var(--badge-sfondo)] transition-colors',
                          i === activeSuggestion && 'bg-[var(--badge-sfondo)] font-semibold text-[var(--accento)]'
                        )}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSelectIngredient(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleAddTyped}
              disabled={!input.trim()}
              className="gap-2 whitespace-nowrap"
            >
              <Plus size={18} aria-hidden="true" />
              Aggiungi
            </Button>
          </div>

          {ingredients.length > 0 && (
            <ul className="ingredients-chips flex flex-wrap gap-2 mb-4">
              {ingredients.map(ing => (
                <li key={ing} className="ingredient-chip inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--sfondo)] border border-[var(--bordo)] rounded-xl text-[var(--testo)]">
                  <span>{ing}</span>
                  <button
                    type="button"
                    className="chip-remove flex items-center justify-center p-1 text-[var(--secondario)] hover:text-[var(--accento)] hover:bg-[var(--bordo)] rounded-lg transition-colors touch-manipulation"
                    onClick={() => handleRemoveIngredient(ing)}
                    aria-label={`Rimuovi ${ing}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {ingredients.length === 0 && (
            <p className="empty-hint text-center text-[var(--secondario)] py-8">
              Nessun ingrediente aggiunto. Inizia a digitare sopra.
            </p>
          )}
        </section>

        {/* Ingredienti base ignorati */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="section-header flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--testo)] m-0">Ingredienti base ignorati</h3>
            <span className="text-xs text-[var(--secondario)]">Non considerati nel calcolo match</span>
          </div>

          <ul className="ignored-list space-y-2 mb-4">
            {ignoredIngredients.length === 0 ? (
              <p className="empty-hint text-center text-[var(--secondario)] py-4">Nessun ingrediente base ignorato</p>
            ) : (
              ignoredIngredients.map(ing => (
                <li key={ing} className="ignored-item flex items-center justify-between p-3 bg-[var(--sfondo)] rounded-xl border border-[var(--card-bordo)]">
                  <span className="text-[var(--testo)]">{ing}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveIgnored(ing)}
                    aria-label={`Rimuovi ${ing} dalle basi`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </li>
              ))
            )}
          </ul>

          <div className="add-ignored flex gap-2 mb-4">
            <input
              type="text"
              value={newIgnoredInput}
              onChange={e => setNewIgnoredInput(e.target.value)}
              onKeyDown={handleIgnoredKeyDown}
              placeholder="Aggiungi ingrediente base da ignorare (es. burro)"
              className="form-input flex-1 px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
            />
            <Button variant="secondary" onClick={handleAddIgnored} className="gap-2 whitespace-nowrap">
              <Plus size={18} aria-hidden="true" />
              Aggiungi
            </Button>
          </div>

          <Button variant="ghost" onClick={handleResetIgnored} className="w-full">
            Ripristina predefiniti ({DEFAULT_IGNORED_INGREDIENTS.join(', ')})
          </Button>
        </section>

        {/* Risultati match */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="section-header flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)] m-0">Ricette trovate</h2>
            {loading && <span className="loading-badge text-xs text-[var(--accento)] animate-pulse">Calcolo in corso…</span>}
          </div>

          {/* Debug info (solo se ingredienti selezionati) */}
          {ingredients.length > 0 && !loading && (
            <div className="debug-info text-xs text-[var(--secondario)] mb-3 p-2 bg-[var(--sfondo)] rounded-lg">
              <div>Ricette complete nel DB: {completeRecipesCount}</div>
              <div>Ricette complete nel mood «{MOOD_LABELS[mood as keyof typeof MOOD_LABELS]}»: {moodFilteredCount}</div>
              <div>Ingredienti selezionati: {ingredients.length} | Basi ignorate: {ignoredIngredients.length}</div>
            </div>
          )}

          {/* Stato iniziale */}
          {ingredients.length === 0 && !loading && (
            <div className="pantry-placeholder text-center py-8">
              <Home size={48} className="pantry-icon mx-auto mb-4 text-[var(--secondario)]" aria-hidden="true" />
              <h3 className="text-lg font-medium text-[var(--testo)] mb-2">Aggiungi ingredienti per iniziare</h3>
              <p className="text-[var(--secondario)]">
                Il calcolo match cercherà ricette che puoi preparare con ciò che hai in casa.
              </p>
            </div>
          )}

          {/* Mood vuoto */}
          {ingredients.length > 0 && moodEmpty && (
            <div className="pantry-placeholder text-center py-8">
              <AlertCircle size={48} className="pantry-icon mx-auto mb-4 text-[var(--accento)]" aria-hidden="true" />
              <h3 className="text-lg font-medium text-[var(--testo)] mb-2">Nessuna ricetta in questo mood</h3>
              <p className="text-[var(--secondario)] mb-4">
                Nessuna ricetta completa per <strong>{MOOD_LABELS[mood as keyof typeof MOOD_LABELS]}</strong>.
              </p>
              <Button variant="primary" onClick={() => setMood('tutti')}>
                <RotateCcw size={16} aria-hidden="true" /> Mostra tutti i mood
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="loading-skeleton space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card bg-[var(--card)] rounded-xl border border-[var(--bordo)] p-3 animate-pulse">
                  <div className="h-5 w-1/2 bg-[var(--bordo)] rounded mb-2" />
                  <div className="h-4 w-1/3 bg-[var(--bordo)] rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Risultati */}
          {!loading && ingredients.length > 0 && !moodEmpty && (
            <>
              {/* Pronte ora */}
              {results.ready.length > 0 && (
                <div className="match-section mb-6">
                  <h3 className="section-subtitle flex items-center gap-2 text-[var(--accento)] mb-3">
                    <CheckCircle size={20} aria-hidden="true" /> Pronte ora ({results.ready.length})
                  </h3>
                  <ul className="space-y-2">
                    {results.ready.map(m => (
                      <li key={m.recipe.id}>
                        <RecipeCard
                          recipe={m.recipe}
                          onClick={() => navigate(`/recipe/${m.recipe.id}`)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ti manca poco */}
              {results.almost.length > 0 && (
                <div className="match-section">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="section-subtitle flex items-center gap-2 text-amber-500" style={{ color: 'var(--accento)' }}>
                      <AlertCircle size={20} aria-hidden="true" /> Ti manca poco ({results.almost.length})
                    </h3>
                    {aiAvailable && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          if (!user) return
                          setSubLoading(true)
                          setSubError(null)
                          try {
                            // Raccoglie tutti gli ingredienti mancanti unici
                            const allMissing = [...new Set(results.almost.flatMap(m => m.missing))]
                            // Prepara ingredienti della ricetta per il contesto
                            const recipeIngredients = results.almost.flatMap(m =>
                              m.recipe.ingredienti?.map((ing: any) => ({ nome: ing.nome })) ?? []
                            )
                            const { sostituzioni } = await aiSubstitutions(
                              'Ricette con ingredienti mancanti',
                              recipeIngredients,
                              allMissing
                            )
                            // Converte in mappa per accesso facile
                            const map: Record<string, Array<{ nome: string; nota: string }>> = {}
                            sostituzioni.forEach(s => {
                              map[s.ingrediente_mancante] = s.sostituzioni
                            })
                            setSubstitutions(map)
                          } catch (e: any) {
                            setSubError(e?.message ?? 'Errore durante la ricerca sostituzioni.')
                          } finally {
                            setSubLoading(false)
                          }
                        }}
                        disabled={subLoading}
                        isLoading={subLoading}
                        className="touch-manipulation min-h-[44px]"
                      >
                        <Sparkles size={16} className="mr-1" /> Sostituzioni AI
                      </Button>
                    )}
                    {!aiAvailable && user && (
                      <span className="text-xs text-[var(--secondario)] px-2 py-1 bg-[var(--sfondo)] rounded-full">
                        AI non disponibile
                      </span>
                    )}
                  </div>
                  {subError && (
                    <div className="mb-3 p-2 bg-[var(--accento)]/10 border border-[var(--accento)]/30 rounded-xl text-sm text-[var(--accento)]" role="alert">
                      {subError}
                      <Button variant="ghost" size="sm" className="ml-2" onClick={() => setSubstitutions({})}>
                        Chiudi
                      </Button>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {results.almost.map(m => (
                      <li key={m.recipe.id}>
                        <RecipeCard
                          recipe={m.recipe}
                          onClick={() => navigate(`/recipe/${m.recipe.id}`)}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                          {m.missing.map(name => (
                            <span key={name} className="missing inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--accento) 20%, transparent)', color: 'var(--accento)' }}>
                              {name}
                              {substitutions[name] && substitutions[name].length > 0 && (
                                <span className="ml-1 cursor-help" title={substitutions[name].map(s => `${s.nome}: ${s.nota}`).join('; ')}>
                                  💡
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                        {m.missing.some(name => substitutions[name]?.length > 0) && (
                          <div className="mt-2 ml-1 space-y-1 text-xs text-[var(--secondario)]">
                            {m.missing
                              .filter(name => substitutions[name]?.length > 0)
                              .map(name => (
                                <div key={name} className="flex flex-wrap gap-1.5">
                                  <span className="font-medium text-[var(--testo)]">{name}:</span>
                                  {substitutions[name].map((s, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--accento) 15%, transparent)', color: 'var(--accento)' }}>
                                      {s.nome} <span className="text-[var(--secondario)] ml-1">— {s.nota}</span>
                                    </span>
                                  ))}
                                </div>
                              ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nessuna ricetta trovata */}
              {results.ready.length === 0 && results.almost.length === 0 && (
                <div className="pantry-placeholder text-center py-8">
                  <AlertCircle size={48} className="pantry-icon mx-auto mb-4 text-[var(--secondario)]" aria-hidden="true" />
                  <h3 className="text-lg font-medium text-[var(--testo)] mb-2">Nessuna ricetta trovata</h3>
                  <p className="text-[var(--secondario)] mb-4">Prova ad aggiungere più ingredienti o cambia il filtro mood.</p>
                  {moodFilteredCount === 0 && (
                    <Button variant="primary" onClick={() => setMood('tutti')}>
                      <RotateCcw size={16} aria-hidden="true" /> Mostra tutti i mood ({completeRecipesCount} ricette totali)
                    </Button>
                  )}
                </div>
              )}

              {/* Punto d'aggancio per sostituzioni AI (passo 9) - non implementato */}
              {/* <div className="ai-swap-hook mt-4 p-4 bg-[var(--sfondo)] rounded-xl border border-dashed border-[var(--bordo)] text-center text-sm text-[var(--secondario)]">
                <span>🔮 Sostituzioni intelligenti (prossimamente)</span>
              </div> */}
            </>
          )}
        </section>
      </main>
    </div>
  )
}