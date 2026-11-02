/**
 * Pagina Cosa ho in casa - FASE B
 * Autocomplete ingredienti DB → chip, basi ignore modificabili qui (spostate da Impostazioni),
 * calcolo match (ingredienti unici per nome), sezioni "Pronte ora" / "Ti manca poco"
 * Rispetta filtro mood (mood bar nel Layout)
 */

import { Home, Plus, Trash2, CheckCircle, AlertCircle, Search, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useMood } from '../contexts/MoodContext'
import { DEFAULT_IGNORED_INGREDIENTS } from '../lib/config'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'

const STORAGE_KEY_IGNORED = 'ricettario-ignored-ingredients'

export function Pantry() {
  const { mood } = useMood()
  const [ingredients, setIngredients] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [ignoredIngredients, setIgnoredIngredients] = useState<string[]>([])
  const [newIgnoredInput, setNewIgnoredInput] = useState('')
  const [matchResults, setMatchResults] = useState<{ ready: any[]; missing: any[] }>({ ready: [], missing: [] })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carica ingredienti ignorati da localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_IGNORED)
      if (stored) {
        setIgnoredIngredients(JSON.parse(stored))
      } else {
        setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
      }
    } catch {
      setIgnoredIngredients([...DEFAULT_IGNORED_INGREDIENTS])
    }
  }, [])

  // Salva in localStorage quando cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IGNORED, JSON.stringify(ignoredIngredients))
    } catch (err) {
      console.error('Errore salvataggio basi:', err)
    }
  }, [ignoredIngredients])

  // Calcola match quando cambiano ingredienti o mood
  const computeMatch = useCallback(async () => {
    if (ingredients.length === 0) {
      setMatchResults({ ready: [], missing: [] })
      return
    }

    setLoading(true)
    try {
      // Recupera tutte le ricette (filtrate per mood se non è 'tutti')
      let query = supabase
        .from('ricette')
        .select('*')
        .eq('stato', 'completa')
        .order('titolo', { ascending: true })

      if (mood !== 'tutti') {
        query = query.eq('mood', mood)
      }

      const { data: recipes, error } = await query

      if (error) throw error

      if (!recipes || recipes.length === 0) {
        setMatchResults({ ready: [], missing: [] })
        return
      }

      // Normalizza ingredienti utente (minuscolo, trim)
      const userIngredients = new Set(ingredients.map(i => i.toLowerCase().trim()))
      // Aggiungi ingredienti base ignorati
      ignoredIngredients.forEach(ing => userIngredients.add(ing.toLowerCase().trim()))

      const ready: any[] = []
      const missing: any[] = []

      for (const recipe of recipes) {
        // Estrai nomi ingredienti unici per ricetta
        const recipeIngredients = new Set<string>()
        const ingredienti = (recipe.ingredienti as unknown as Array<{ nome: string }>) || []
        ingredienti.forEach((ing) => {
          if (ing.nome) {
            recipeIngredients.add(ing.nome.toLowerCase().trim())
          }
        })

        // Calcola ingredienti mancanti
        const missingIngredients = [...recipeIngredients].filter(ing => !userIngredients.has(ing))

        if (missingIngredients.length === 0) {
          ready.push(recipe)
        } else if (missingIngredients.length <= 2) {
          missing.push({ recipe, missing: missingIngredients })
        }
      }

      setMatchResults({ ready, missing })
    } catch (err) {
      console.error('Errore calcolo match:', err)
    } finally {
      setLoading(false)
    }
  }, [ingredients, ignoredIngredients, mood])

  useEffect(() => {
    computeMatch()
  }, [computeMatch])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed].sort())
      setInput('')
    }
  }

  const handleRemove = (ing: string) => {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  const handleAddIgnored = () => {
    const trimmed = newIgnoredInput.trim().toLowerCase()
    if (!trimmed) return
    if (ignoredIngredients.includes(trimmed)) {
      showMessage('error', 'Già presente nella lista')
      return
    }
    setIgnoredIngredients(prev => [...prev, trimmed].sort())
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

  return (
    <div className="page-container pantry-page">
      <main className="pantry-content max-w-[720px] mx-auto px-4 pb-24 pt-4">
        {/* Toast message */}
        {message && (
          <div className={`toast fixed top-4 left-4 right-4 max-w-[720px] mx-auto z-50 px-4 ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-current/20 animate-in slide-in-from-top-2 duration-200">
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
            <h2 className="text-lg font-semibold text-[var(--testo)]">Ingredienti disponibili</h2>
          </div>

          <div className="add-ingredient flex gap-2 mb-4">
            <div className="search-wrapper flex-1 relative">
              <Search size={18} className="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondario)]" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Aggiungi ingrediente (es. pomodori, pasta, uova...)"
                className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 pl-10"
                autoFocus
              />
            </div>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={!input.trim()}
              className="gap-2 whitespace-nowrap"
            >
              <Plus size={18} /> Aggiungi
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
                    onClick={() => handleRemove(ing)}
                    aria-label={`Rimuovi ${ing}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {ingredients.length === 0 && (
            <p className="empty-hint text-center text-[var(--secondario)] py-8">Nessun ingrediente aggiunto. Inizia a digitare sopra.</p>
          )}
        </section>

        {/* Ingredienti base ignorati - MODIFICABILI QUI (spostati da Impostazioni) */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="section-header flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--testo)]">Ingredienti base ignorati</h3>
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
                    <Trash2 size={16} />
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
              onKeyDown={e => e.key === 'Enter' && handleAddIgnored()}
              placeholder="Aggiungi ingrediente base da ignorare (es. burro)"
              className="form-input flex-1 px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
            />
            <Button variant="secondary" onClick={handleAddIgnored} className="gap-2 whitespace-nowrap">
              <Plus size={18} /> Aggiungi
            </Button>
          </div>

          <Button variant="ghost" onClick={handleResetIgnored} className="w-full">
            Ripristina predefiniti ({DEFAULT_IGNORED_INGREDIENTS.join(', ')})
          </Button>
        </section>

        {/* Risultati match */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="section-header flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)]">Ricette trovate</h2>
            {loading && <span className="loading-badge text-xs text-[var(--accento)] animate-pulse">Calcolo in corso...</span>}
          </div>

          {/* Pronte ora */}
          {matchResults.ready.length > 0 && (
            <div className="match-section mb-6">
              <h3 className="section-subtitle flex items-center gap-2 text-[var(--accento)] mb-3">
                <CheckCircle size={20} /> Pronte ora ({matchResults.ready.length})
              </h3>
              <ul className="space-y-2">
                {matchResults.ready.map(recipe => (
                  <li key={recipe.id} className="match-item flex items-center justify-between p-3 bg-[var(--sfondo)] rounded-xl border border-[var(--card-bordo)] hover:border-[var(--accento)] transition-colors">
                    <div className="match-info flex-1 min-w-0">
                      <p className="font-medium text-[var(--testo)] truncate">{recipe.titolo}</p>
                      <p className="text-sm text-[var(--secondario)]">
                        {recipe.categoria && `Categoria: ${recipe.categoria} · `}
                        {recipe.tempo_minuti && `Tempo: ${recipe.tempo_minuti}min`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ti manca poco */}
          {matchResults.missing.length > 0 && (
            <div className="match-section">
              <h3 className="section-subtitle flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
                <AlertCircle size={20} /> Ti manca poco ({matchResults.missing.length})
              </h3>
              <ul className="space-y-2">
                {matchResults.missing.map(({ recipe, missing }) => (
                  <li key={recipe.id} className="match-item flex items-start justify-between gap-4 p-3 bg-[var(--sfondo)] rounded-xl border border-[var(--card-bordo)] hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                    <div className="match-info flex-1 min-w-0">
                      <p className="font-medium text-[var(--testo)] truncate">{recipe.titolo}</p>
                      <p className="text-sm text-[var(--secondario)]">
                        {recipe.categoria && `Categoria: ${recipe.categoria} · `}
                        {recipe.tempo_minuti && `Tempo: ${recipe.tempo_minuti}min`}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Mancanti: {missing.join(', ')}
                      </p>
                    </div>
                    {/* Pulsante Sostituzioni AI - placeholder FASE C */}
                    <Button variant="ghost" size="sm" disabled className="whitespace-nowrap opacity-50">
                      Sostituzioni
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ingredients.length === 0 && (
            <div className="pantry-placeholder text-center py-8">
              <Home size={48} className="pantry-icon mx-auto mb-4 text-[var(--secondario)]" />
              <h3 className="text-lg font-medium text-[var(--testo)] mb-2">Aggiungi ingredienti per iniziare</h3>
              <p className="text-[var(--secondario)]">Il calcolo match cercherà ricette che puoi preparare con ciò che hai in casa.</p>
            </div>
          )}

          {ingredients.length > 0 && matchResults.ready.length === 0 && matchResults.missing.length === 0 && !loading && (
            <div className="pantry-placeholder text-center py-8">
              <CheckCircle size={48} className="pantry-icon mx-auto mb-4 text-[var(--secondario)]" />
              <h3 className="text-lg font-medium text-[var(--testo)] mb-2">Nessuna ricetta trovata</h3>
              <p className="text-[var(--secondario)]">Prova ad aggiungere più ingredienti o cambia il filtro mood.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}