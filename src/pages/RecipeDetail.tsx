/**
 * Pagina Dettaglio Ricetta con modalità cucina, scaling porzioni, ingredienti leggibili
 * Usa componenti condivisi: Button, Badge
 * NOTA: Header e Mood Bar ora sono nel Layout component
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock, Users, Tag, AlertCircle,
  ChefHat, X, Check, ChevronUp, ChevronDown,
  Plus, Minus, Edit, ChevronLeft, Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import { getRecipeById, incrementRecipeMade, deleteRecipe } from '../lib/supabase'
import { addHistoryEntry } from '../lib/history'
import {
  MOOD_LABELS,
  CATEGORIE_LABELS,
  STATO_LABELS,
  GRUPPI_INGREDIENTI,
  DIFFICOLTA_LABELS,
  DIFFICOLTA_BADGE_CLASSES,
  type Mood,
  type Difficolta
} from '../lib/config'
import { type Ingrediente, type Passaggio, type Variante, normalizeRecipeFromDb } from '../lib/types'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { AIChat } from '../components/AIChat'

interface RecipeDetailData {
  id: string
  created_at: string
  updated_at: string
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
  ingredienti: Ingrediente[]
  passaggi: Passaggio[]
  varianti: Variante[]
  note: string | null
  descrizione: string | null
  volte_fatta: number | null
  ultima_volta: string | null
}

interface ScaledIngredient extends Ingrediente {
  quantita_scalata: string
  originale: number | null
}

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { mood } = useMood()

  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [porzioni, setPorzioni] = useState<number>(1)
  const [cookingMode, setCookingMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const isAuthorized = user !== null
  // Traccia il mood precedente per rilevare cambi attivi dell'utente
  const prevMoodRef = useRef<string>(mood)
  const isInitialMount = useRef(true)

  // Carica ricetta
  const loadRecipe = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipeById(id)
      if (data) {
        const formData = normalizeRecipeFromDb(data)
        setRecipe({
          ...data,
          ingredienti: formData.ingredienti,
          passaggi: formData.passaggi,
          varianti: formData.varianti,
          tags: formData.tags,
          note: formData.note,
          descrizione: formData.descrizione,
        } as RecipeDetailData)
        setPorzioni(data.porzioni || 1)
        setCurrentStep(0)
      } else {
        setError('Ricetta non trovata')
      }
    } catch (err) {
      setError('Errore nel caricamento')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecipe()
  }, [loadRecipe])

  // Gestione cambio mood: se l'utente cambia mood dalla pagina di dettaglio,
  // reindirizza automaticamente all'elenco filtrato per il nuovo mood
  useEffect(() => {
    // Salta il redirect al mount iniziale
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevMoodRef.current = mood
      return
    }

    // Se il mood è cambiato rispetto al precedente (cambio attivo utente)
    if (mood !== prevMoodRef.current && recipe) {
      prevMoodRef.current = mood
      const moodLabel = MOOD_LABELS[mood]
      setToast(`Visualizzi l'elenco per ${moodLabel}`)
      // Naviga alla lista ricette (home) con il nuovo mood
      navigate('/', { replace: true })
    }
  }, [mood, recipe, navigate])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Calcola ingredienti scalati
  const scaledIngredients = useMemo((): ScaledIngredient[] => {
    if (!recipe) return []
    const factor = porzioni / (recipe.porzioni || 1)

    return recipe.ingredienti.map(ing => {
      const qty = typeof ing.quantita === 'number' ? ing.quantita : null
      let quantita_scalata: string

      if (qty !== null && ing.unita && !['qb', 'a piacere'].includes(ing.unita.toLowerCase())) {
        const scaled = Math.round(qty * factor * 100) / 100
        quantita_scalata = scaled % 1 === 0 ? String(Math.round(scaled)) : String(scaled)
      } else {
        quantita_scalata = ing.quantita as string
      }

      return {
        ...ing,
        quantita_scalata,
        originale: qty,
      }
    })
  }, [recipe, porzioni])

  // Raggruppa ingredienti per gruppo
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, ScaledIngredient[]> = {}
    scaledIngredients.forEach(ing => {
      const gruppo = ing.gruppo || 'altro'
      if (!groups[gruppo]) groups[gruppo] = []
      groups[gruppo].push(ing)
    })
    const ordered: Record<string, ScaledIngredient[]> = {}
    ;(GRUPPI_INGREDIENTI as readonly string[]).forEach((g: string) => {
      if (groups[g]) ordered[g] = groups[g]
    })
    Object.keys(groups).forEach((g: string) => {
      if (!(GRUPPI_INGREDIENTI as readonly string[]).includes(g)) ordered[g] = groups[g]
    })
    return ordered
  }, [scaledIngredients])

  const handlePorzioniChange = (delta: number) => {
    setPorzioni(prev => Math.max(1, Math.min(50, prev + delta)))
  }

  const handleMarkMade = async () => {
    if (!recipe || !isAuthorized) return
    try {
      await incrementRecipeMade(recipe.id)
      setRecipe(prev => prev ? {
        ...prev,
        volte_fatta: (prev.volte_fatta || 0) + 1,
        ultima_volta: new Date().toISOString()
      } : null)
      // Registra la preparazione nella cronologia locale
      addHistoryEntry({
        ricetta_id: recipe.id,
        titolo: recipe.titolo,
        mood: recipe.mood,
        categoria: recipe.categoria,
      })
      setToast(`«${recipe.titolo}» aggiunta alla Cronologia`)
    } catch (err) {
      console.error('Errore aggiornamento contatore:', err)
    }
  }

  const handleDeleteRecipe = async () => {
    if (!recipe || !isAuthorized) return
    const confirmed = window.confirm(`Sei sicuro di voler eliminare "${recipe.titolo}"? L'operazione non è annullabile.`)
    if (!confirmed) return
    try {
      await deleteRecipe(recipe.id)
      navigate('/')
    } catch (err) {
      console.error('Errore eliminazione ricetta:', err)
      alert('Errore durante l\'eliminazione. Riprova.')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="page-container detail-page">
        <main className="detail-content">
          <div className="loading-skeleton space-y-4">
            <div className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
              <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
              <div className="h-4 w-1/2 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/3 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/4 bg-[var(--bordo)] rounded" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="page-container detail-page">
        <main className="detail-content">
          <div className="error-state card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--accento)]" />
            <h2 className="text-xl font-semibold text-[var(--testo)] mb-2">{error || 'Ricetta non trovata'}</h2>
            <Button variant="primary" onClick={() => navigate('/')}>Torna all'elenco</Button>
          </div>
        </main>
      </div>
    )
  }

  const passaggi = recipe.passaggi || []

  // Helper per valori numerici: mostra "da aggiungere" se null/0
  const formatNumberOrPlaceholder = (value: number | null | undefined, unit: string = '') => {
    if (value == null || value === 0) return 'da aggiungere'
    return `${value} ${unit}`.trim()
  }

  const formatAutore = (value: string | null) => value || 'Autore non indicato'
  const formatPorzioni = (value: number | null, unit: string | null) => {
    if (value == null || value === 0) return 'Porzioni non indicate'
    return `${value} ${unit || 'porzioni'}`
  }

  return (
    <div className="page-container detail-page">
      {/* Toast per redirect mood */}
      {toast && (
        <div className="fixed top-16 left-4 right-4 max-w-[720px] mx-auto z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-[var(--accento)] text-[var(--accento-testo)] px-4 py-3 rounded-xl shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <main className="detail-content max-w-[720px] mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {/* Back button - top left */}
        <Link
          to="/"
          className="back-button inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--card-bordo)] text-[var(--testo)] text-sm font-medium hover:bg-[var(--card-bordo)] active:bg-[var(--card-bordo)] active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 ease-out touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2 mb-4"
          aria-label="Torna all'elenco"
        >
          <ChevronLeft size={20} />
          <span>Torna all'elenco</span>
        </Link>

        {/* Titolo ricetta con badge mood, categoria, difficoltà */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--testo)] mb-3 break-words hyphens-auto text-wrap">{recipe.titolo}</h1>
          <div className="flex flex-wrap gap-2">
            {recipe.mood && (
              <span className="inline-flex items-center gap-1">
                <Badge variant="mood" className="px-2 py-0.5">{MOOD_LABELS[recipe.mood as Mood] || recipe.mood}</Badge>
              </span>
            )}
            {recipe.categoria && (
              <span className="inline-flex items-center gap-1">
                <Badge variant="tag" className="px-2 py-0.5">{CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] || recipe.categoria}</Badge>
              </span>
            )}
            {recipe.difficolta && (
              <span className="inline-flex items-center gap-1">
                <span className={DIFFICOLTA_BADGE_CLASSES[recipe.difficolta as Difficolta]}>
                  {DIFFICOLTA_LABELS[recipe.difficolta as Difficolta]}
                </span>
              </span>
            )}
            {recipe.stato === 'da_completare' && (
              <Badge variant="stato" className="px-2 py-0.5">{STATO_LABELS.da_completare}</Badge>
            )}
          </div>
        </section>

        {/* Info principali - 3 riquadri di uguale larghezza */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Riquadro Tempo */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px] border border-[var(--card-bordo)]">
              <Clock size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center font-medium uppercase tracking-wider">Tempo</p>
              <p className="font-semibold text-[var(--testo)] text-center text-lg">{formatNumberOrPlaceholder(recipe.tempo_minuti, 'min')}</p>
            </div>

            {/* Riquadro Porzioni - Enhanced con controllo interattivo prominente */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px] border border-[var(--card-bordo)] relative overflow-visible">
              <Users size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center font-medium uppercase tracking-wider mb-2">Porzioni</p>

              {/* Porzioni controller - prominent and interactive */}
              <div className="porzioni-controller flex items-center justify-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => handlePorzioniChange(-1)}
                  aria-label="Meno porzioni"
                  disabled={porzioni <= 1}
                  className={clsx(
                    'porzioni-btn flex items-center justify-center w-10 h-10 rounded-xl',
                    'transition-[transform,background-color,box-shadow] duration-150 ease-out',
                    'active:scale-[0.95]',
                    'touch-manipulation',
                    porzioni <= 1
                      ? 'bg-[var(--bordo)] text-[var(--secondario)] cursor-not-allowed'
                      : 'bg-[var(--card)] text-[var(--testo)] border border-[var(--card-bordo)] hover:bg-[var(--accento)] hover:border-[var(--accento)] hover:text-[var(--accento-testo)] hover:shadow-[var(--elevazione-1)] focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2'
                  )}
                >
                  <Minus size={20} style={{ flexShrink: 0, color: 'inherit' }} />
                </button>

                <div className="porzioni-display flex items-center justify-center min-w-[5rem] px-2">
                  <span className="font-bold text-[var(--testo)] text-xl text-center transition-transform duration-150 ease-out"
                        style={{ transform: `scale(${porzioni > (recipe.porzioni || 1) ? 1.05 : 1})` }}>
                    {formatPorzioni(porzioni, recipe.porzioni_unita)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handlePorzioniChange(1)}
                  aria-label="Più porzioni"
                  disabled={porzioni >= 50}
                  className={clsx(
                    'porzioni-btn flex items-center justify-center w-10 h-10 rounded-xl',
                    'transition-[transform,background-color,box-shadow] duration-150 ease-out',
                    'active:scale-[0.95]',
                    'touch-manipulation',
                    porzioni >= 50
                      ? 'bg-[var(--bordo)] text-[var(--secondario)] cursor-not-allowed'
                      : 'bg-[var(--card)] text-[var(--testo)] border border-[var(--card-bordo)] hover:bg-[var(--accento)] hover:border-[var(--accento)] hover:text-[var(--accento-testo)] hover:shadow-[var(--elevazione-1)] focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2'
                  )}
                >
                  <Plus size={20} style={{ flexShrink: 0, color: 'inherit' }} />
                </button>
              </div>

              {/* Indicatore scala rispetto all'originale */}
              {porzioni !== (recipe.porzioni || 1) && (
                <span className="porzioni-scale-badge absolute -top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-[var(--accento)] text-[var(--accento-testo)] font-medium animate-in fade-in zoom-in-95 duration-150">
                  x{(porzioni / (recipe.porzioni || 1)).toFixed(1)}
                </span>
              )}
            </div>

            {/* Riquadro Autore */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px] border border-[var(--card-bordo)]">
              <Tag size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center font-medium uppercase tracking-wider">Autore</p>
              <p className="font-medium text-[var(--testo)] text-center break-words">{formatAutore(recipe.autore)}</p>
            </div>
          </div>

          {recipe.volte_fatta != null && recipe.volte_fatta > 0 && (
            <div className="info-item flex items-center justify-center gap-3 p-3 bg-[var(--sfondo)] rounded-xl mb-4 text-center border border-[var(--card-bordo)]">
              <span className="text-sm text-[var(--secondario)]">Fatta {recipe.volte_fatta} {recipe.volte_fatta === 1 ? 'volta' : 'volte'}</span>
              <span className="font-medium text-[var(--testo)]">Ultima: {formatDate(recipe.ultima_volta)}</span>
            </div>
          )}

          {recipe.descrizione && (
            <div className="note-section mb-4">
              <h3 className="text-sm font-semibold text-[var(--testo)] mb-2">Descrizione</h3>
              <p className="text-[var(--secondario)] text-sm">{recipe.descrizione}</p>
            </div>
          )}

          {recipe.varianti && recipe.varianti.length > 0 && (
            <div className="varianti-section mb-4">
              <h3 className="text-sm font-semibold text-[var(--testo)] mb-2">Varianti</h3>
              <ul className="space-y-2">
                {recipe.varianti.map((v, i) => (
                  <li key={i} className="variante-item text-sm text-[var(--secondario)]">
                    {v.titolo && <strong className="text-[var(--testo)]">{v.titolo}: </strong>}
                    <span>{v.testo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.note && (
            <div className="note-section mb-4">
              <h3 className="text-sm font-semibold text-[var(--testo)] mb-2">Note</h3>
              <p className="text-[var(--secondario)] text-sm">{recipe.note}</p>
            </div>
          )}
        </section>

        {/* Pulsante "Completa" per ricette da completare - SEMPRE visibile, alto contrasto WCAG AA */}
        {recipe.stato === 'da_completare' && isAuthorized && (
          <section className="card bg-[var(--card)] rounded-2xl border-2 border-[var(--accento)] p-4 mb-4 shadow-[var(--elevazione-2)]"
                   style={{ background: 'var(--card)', boxShadow: 'var(--elevazione-2), 0 0 0 1px var(--accento)' }}>
            <Link to={`/edit/${recipe.id}`}>
              <Button variant="primary" className="w-full" size="lg"
                      style={{
                        background: 'var(--accento)',
                        color: 'var(--accento-testo)',
                        fontWeight: 700,
                        boxShadow: 'var(--elevazione-1), 0 0 0 2px color-mix(in srgb, var(--accento) 30%, transparent)'
                      }}>
                <Edit size={20} className="mr-2" style={{ flexShrink: 0 }} /> Completa questa ricetta
              </Button>
            </Link>
          </section>
        )}

        {/* Pulsante "Modifica ricetta" - per tutti gli utenti autorizzati */}
        {isAuthorized && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
            <div className="flex gap-3">
              <Link to={`/edit/${recipe.id}`} className="flex-1">
                <Button variant="secondary" size="lg" className="w-full">
                  <Edit size={20} className="mr-2" style={{ flexShrink: 0 }} /> Modifica
                </Button>
              </Link>
              <button
                type="button"
                onClick={handleDeleteRecipe}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-400 text-white font-medium hover:bg-rose-500 active:bg-rose-600 active:scale-[0.97] transition-[transform,background-color] duration-150 touch-manipulation focus-visible:outline-2 focus-visible:outline-rose-400 focus-visible:outline-offset-2"
              >
                <Trash2 size={20} className="flex-shrink-0" />
                <span>Elimina</span>
              </button>
            </div>
          </section>
        )}

        {/* Ingredienti - lista leggibile raggruppata per gruppo, SENZA checkbox */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
          <h2 className="text-lg font-semibold text-[var(--testo)] mb-4">Ingredienti</h2>

          {Object.entries(groupedIngredients).map(([gruppo, ingredients]) => (
            <div key={gruppo} className="ingredient-group mb-4">
              <h3 className="group-title text-sm font-semibold text-[var(--secondario)] uppercase tracking-wider mb-2 pb-2 border-b border-[var(--card-bordo)]">
                {(GRUPPI_INGREDIENTI as readonly string[]).includes(gruppo) ? gruppo.charAt(0).toUpperCase() + gruppo.slice(1) : gruppo}
              </h3>
              <ul className="ingredients-list space-y-2">
                {ingredients.map(ing => (
                  <li key={`${ing.nome}-${ing.unita}-${ing.gruppo}`} className="ingredient-item flex items-center gap-3 p-3 bg-[var(--sfondo)] rounded-xl border border-[var(--card-bordo)] transition-[background-color,border-color] duration-150 ease-out hover:border-[var(--accento)]">
                    <div className="ingredient-details flex-1 min-w-0">
                      <p className="ingredient-name font-medium text-[var(--testo)] truncate">{ing.nome}</p>
                      <p className="ingredient-qty text-sm text-[var(--secondario)]">{ing.quantita_scalata} {ing.unita}</p>
                    </div>
                    {ing.note && <span className="ingredient-note text-xs text-[var(--secondario)] ml-2 whitespace-nowrap">({ing.note})</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {recipe.stato === 'da_completare' && (
            <p className="da-completare-notice text-sm text-[var(--secondario)] text-center py-4">
              Ricetta da completare: mancano ingredienti dettagliati e passaggi.
            </p>
          )}
        </section>

        {/* Passaggi */}
        {recipe.stato !== 'da_completare' && passaggi.length > 0 && (
          <section className={clsx('card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]', cookingMode && 'cooking-mode')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--testo)]">Procedimento</h2>
              <Button
                variant={cookingMode ? 'primary' : 'secondary'}
                onClick={() => {
                  setCookingMode(!cookingMode)
                  if (!cookingMode) setCurrentStep(0)
                }}
                className="gap-2"
              >
                <ChefHat size={18} />
                {cookingMode ? 'Esci modalità cucina' : 'Modalità cucina'}
              </Button>
            </div>

            {cookingMode ? (
              <div className="cooking-mode-view">
                <div className="cooking-progress mb-6">
                  <div className="progress-bar h-2 bg-[var(--card-bordo)] rounded-full overflow-hidden mb-2">
                    <div
                      className="progress-fill h-full bg-[var(--accento)]"
                      style={{
                        width: `${((currentStep + 1) / passaggi.length) * 100}%`,
                        transition: 'width 200ms cubic-bezier(0.23, 1, 0.32, 1)'
                      }}
                    />
                  </div>
                  <p className="progress-text text-sm text-[var(--secondario)] text-center font-medium">Passaggio {currentStep + 1} di {passaggi.length}</p>
                </div>
                <div className="cooking-step text-center mb-8">
                  {passaggi[currentStep].titolo && (
                    <h4 className="step-titolo text-xl font-semibold text-[var(--testo)] mb-3">{passaggi[currentStep].titolo}</h4>
                  )}
                  <p className="step-text text-lg text-[var(--testo)] leading-relaxed mb-6">{passaggi[currentStep].testo}</p>
                </div>
                <div className="cooking-nav flex items-center justify-between">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                    className="gap-2"
                  >
                    <ChevronUp size={24} />
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentStep(prev => Math.min(passaggi.length - 1, prev + 1))}
                    disabled={currentStep === passaggi.length - 1}
                    className="gap-2"
                  >
                    Avanti <ChevronDown size={24} />
                  </Button>
                </div>
              </div>
            ) : (
              <ol className="steps-list space-y-6">
                {passaggi.map((step, i) => (
                  <li key={i} className="step-item flex gap-4">
                    <span className="step-number w-10 h-10 rounded-full bg-[var(--accento)] text-[var(--accento-testo)] flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1 shadow-[var(--elevazione-1)]">
                      {i + 1}
                    </span>
                    <div className="step-content flex-1">
                      {step.titolo && <h4 className="step-titolo text-lg font-semibold text-[var(--testo)] mb-2">{step.titolo}</h4>}
                      <p className="text-[var(--testo)] leading-relaxed mb-2">{step.testo}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* "La faccio!" button */}
        {isAuthorized && recipe.stato !== 'da_completare' && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--card-bordo)] p-4 mb-4 shadow-[var(--elevazione-1)]">
            <Button variant="primary" size="lg" className="w-full" onClick={handleMarkMade}>
              <Check size={20} className="mr-2" /> La faccio! (aggiorna contatore)
            </Button>
          </section>
        )}

        {/* AI Chat - FASE C */}
        {recipe && (
          <AIChat
            recipe={{
              ...recipe,
              autore: recipe.autore ?? undefined,
              categoria: recipe.categoria ?? undefined,
              mood: recipe.mood ?? undefined,
              difficolta: recipe.difficolta ?? undefined,
              tags: recipe.tags ?? undefined,
              note: recipe.note ?? undefined,
              descrizione: recipe.descrizione ?? undefined,
              tempo_minuti: recipe.tempo_minuti ?? undefined,
              porzioni: recipe.porzioni ?? undefined,
              porzioni_unita: recipe.porzioni_unita ?? undefined,
              ingredienti: recipe.ingredienti,
              passaggi: recipe.passaggi,
              varianti: recipe.varianti,
            }}
          />
        )}
      </main>

      {/* Modalità cucina overlay per mobile */}
      {cookingMode && (
        <div className="cooking-overlay fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setCookingMode(false)} aria-hidden="true"
          style={{
            opacity: 1,
            transition: 'opacity 200ms var(--ease-out)',
          }}>
          <div className="cooking-overlay-content absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-[var(--card)] rounded-t-3xl border-t-2 border-[var(--accento)] shadow-[var(--elevazione-overlay)]" onClick={e => e.stopPropagation()}
            style={{
              transform: 'translateY(0)',
              transition: 'transform 300ms var(--ease-drawer)',
            }}>
            <div className="p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setCookingMode(false)}
                  className="back-button inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--card-bordo)] text-[var(--testo)] text-sm font-medium hover:bg-[var(--card-bordo)] active:bg-[var(--card-bordo)] active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 ease-out touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2"
                  aria-label="Esci dalla modalità cucina"
                >
                  <ChevronLeft size={20} />
                  <span>Indietro</span>
                </button>
                <h2 className="flex-1 text-lg font-semibold text-[var(--testo)]">Modalità cucina</h2>
                <Button variant="ghost" size="sm" onClick={() => setCookingMode(false)} aria-label="Chiudi modalità cucina">
                  <X size={24} />
                </Button>
              </div>
              <div className="cooking-progress mb-6">
                <div className="progress-bar h-2 bg-[var(--card-bordo)] rounded-full overflow-hidden mb-2">
                  <div
                    className="progress-fill h-full bg-[var(--accento)]"
                    style={{
                      width: `${((currentStep + 1) / passaggi.length) * 100}%`,
                      transition: 'width 200ms var(--ease-out)'
                    }}
                  />
                </div>
                <p className="progress-text text-sm text-[var(--secondario)] text-center font-medium">Passaggio {currentStep + 1} di {passaggi.length}</p>
              </div>
              <div className="cooking-step text-center mb-8">
                {passaggi[currentStep]?.titolo && (
                  <h4 className="step-titolo text-xl font-semibold text-[var(--testo)] mb-3">{passaggi[currentStep]!.titolo}</h4>
                )}
                <p className="cooking-step-text text-lg text-[var(--testo)] leading-relaxed mb-6">{passaggi[currentStep]?.testo}</p>
              </div>
              <div className="cooking-nav flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronUp size={24} />
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(prev => Math.min(passaggi.length - 1, prev + 1))}
                  disabled={currentStep === passaggi.length - 1}
                  className="gap-2"
                >
                  <ChevronDown size={24} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}