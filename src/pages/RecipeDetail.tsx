/**
 * Pagina Dettaglio Ricetta con modalità cucina, scaling porzioni, ingredienti spuntabili
 * Usa componenti condivisi: Header, Button, Badge
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock, Users, Tag, Heart, AlertCircle,
  ChefHat, X, Check, ChevronUp, ChevronDown,
  Plus, Minus, Edit, MessageSquare
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import { getRecipeById, incrementRecipeMade } from '../lib/supabase'
import {
  CATEGORIE_LABELS, MOOD_LABELS, STATO_LABELS,
  GRUPPI_INGREDIENTI, type Mood
} from '../lib/config'
import { type Ingrediente, type Passaggio, type Variante, normalizeRecipeFromDb } from '../lib/types'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'

interface RecipeDetailData {
  id: string
  created_at: string
  updated_at: string
  titolo: string
  autore: string | null
  stato: 'completa' | 'da_completare'
  categoria: string | null
  mood: string | null
  tags: string[] | null
  tempo_minuti: number | null
  porzioni: number | null
  porzioni_unita: string | null
  ingredienti: Ingrediente[]
  passaggi: Passaggio[]
  varianti: Variante[]
  note: string | null
  descrizione: string | null
  fonte_url: string | null
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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const isAuthorized = user !== null
  // Traccia se il cambio mood è stato iniziato dall'utente (non da link diretto)
  const userInitiatedMoodChange = useRef(false)

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
          fonte_url: formData.fonte_url,
        } as RecipeDetailData)
        setPorzioni(data.porzioni || 1)
        setCheckedIngredients(new Set())
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
  // reindirizza sempre all'elenco filtrato per il nuovo mood
  useEffect(() => {
    if (!recipe || !userInitiatedMoodChange.current) return

    const currentMood = mood
    userInitiatedMoodChange.current = false

    const moodLabel = MOOD_LABELS[currentMood]
    setToast(`Visualizzi l'elenco per ${moodLabel}`)
    // Sostituisce la voce di cronologia
    navigate('/', { replace: true, state: { mood: currentMood } })
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

  const handleIngredientToggle = (nome: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

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
    } catch (err) {
      console.error('Errore aggiornamento contatore:', err)
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
        <Header title="Caricamento..." />
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
        <Header title="Errore" />
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

  const moodLabel = recipe.mood && recipe.mood in MOOD_LABELS ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const categoriaLabel = recipe.categoria ? CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] : '—'
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
          <div className="bg-[var(--accento)] text-[var(--accento-test)] px-4 py-3 rounded-xl shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* Header con azioni - passa handleMoodChange per intercettare cambi utente */}
      <Header title={recipe.titolo} onMoodChange={() => { userInitiatedMoodChange.current = true; }}>
        <div className="flex items-center gap-2">
          {recipe.categoria && (
            <Badge variant="tag">
              <Tag size={12} className="mr-1" /> {categoriaLabel}
            </Badge>
          )}
          {recipe.mood && (
            <Badge variant="mood">
              <Heart size={12} className="mr-1" /> {moodLabel}
            </Badge>
          )}
          {recipe.stato === 'da_completare' && (
            <Badge variant="stato">
              <AlertCircle size={12} className="mr-1" /> {STATO_LABELS.da_completare}
            </Badge>
          )}
        </div>
      </Header>

      <main className="detail-content max-w-[720px] mx-auto px-4 pb-24 pt-4">
        {/* Info principali - 3 riquadri di uguale larghezza */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Riquadro Tempo */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px]">
              <Clock size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center">Tempo</p>
              <p className="font-medium text-[var(--testo)] text-center">{formatNumberOrPlaceholder(recipe.tempo_minuti, 'min')}</p>
            </div>

            {/* Riquadro Porzioni */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px]">
              <Users size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center">Porzioni</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handlePorzioniChange(-1)} aria-label="Meno porzioni" className="p-1">
                  <Minus size={16} />
                </Button>
                <span className="font-medium text-[var(--testo)] text-center min-w-[5rem]">{formatPorzioni(recipe.porzioni, recipe.porzioni_unita)}</span>
                <Button variant="ghost" size="sm" onClick={() => handlePorzioniChange(1)} aria-label="Più porzioni" className="p-1">
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Riquadro Autore */}
            <div className="info-box flex flex-col items-center justify-center p-4 bg-[var(--sfondo)] rounded-xl min-h-[80px]">
              <Tag size={24} className="text-[var(--accento)] mb-2" aria-hidden="true" />
              <p className="text-xs text-[var(--secondario)] text-center">Autore</p>
              <p className="font-medium text-[var(--testo)] text-center break-words">{formatAutore(recipe.autore)}</p>
            </div>
          </div>

          {recipe.volte_fatta != null && recipe.volte_fatta > 0 && (
            <div className="info-item flex items-center justify-center gap-2 p-3 bg-[var(--sfondo)] rounded-xl mb-4 text-center">
              <span className="text-xs text-[var(--secondario)]">Fatta {recipe.volte_fatta} volte</span>
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
                    {v.video_secondi && recipe.fonte_url && (
                      <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accento)] text-xs mt-1 hover:underline">
                        <MessageSquare size={14} /> Guarda nel video al {v.video_secondi}s
                      </a>
                    )}
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

          {recipe.fonte_url && (
            <div className="note-section">
              <h3 className="text-sm font-semibold text-[var(--testo)] mb-2">Fonte</h3>
              <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accento)] text-sm hover:underline">
                <MessageSquare size={16} /> {recipe.fonte_url}
              </a>
            </div>
          )}
        </section>

        {/* Pulsante "Completa" per ricette da completare */}
        {recipe.stato === 'da_completare' && isAuthorized && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
            <Link to={`/edit/${recipe.id}`}>
              <Button variant="primary" className="w-full" size="lg">
                <Edit size={20} className="mr-2" /> Completa questa ricetta
              </Button>
            </Link>
          </section>
        )}

        {/* Ingredienti */}
        <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--testo)]">Ingredienti</h2>
            {Object.keys(groupedIngredients).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckedIngredients(new Set())}
                className={clsx(checkedIngredients.size > 0 && 'text-[var(--accento)]')}
              >
                {checkedIngredients.size > 0 ? `Deseleziona tutto (${checkedIngredients.size})` : 'Deseleziona tutto'}
              </Button>
            )}
          </div>

          {Object.entries(groupedIngredients).map(([gruppo, ingredients]) => (
            <div key={gruppo} className="ingredient-group mb-4">
              <h3 className="group-title text-sm font-semibold text-[var(--secondario)] uppercase tracking-wider mb-2 pb-2 border-b border-[var(--bordo)]">
                {(GRUPPI_INGREDIENTI as readonly string[]).includes(gruppo) ? gruppo.charAt(0).toUpperCase() + gruppo.slice(1) : gruppo}
              </h3>
              <ul className="ingredients-list space-y-2">
                {ingredients.map(ing => (
                  <li key={`${ing.nome}-${ing.unita}-${ing.gruppo}`} className="ingredient-item flex items-start gap-3 p-3 bg-[var(--sfondo)] rounded-xl">
                    <label className="ingredient-checkbox flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={checkedIngredients.has(ing.nome)}
                        onChange={() => handleIngredientToggle(ing.nome)}
                        className="w-5 h-5 rounded border-[var(--bordo)] text-[var(--accento)] focus:ring-2 focus:ring-[var(--accento)] focus:ring-offset-2 focus:ring-offset-[var(--sfondo)] cursor-pointer touch-manipulation"
                      />
                    </label>
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
          <section className={clsx('card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4', cookingMode && 'cooking-mode')}>
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
                  <div className="progress-bar h-2 bg-[var(--bordo)] rounded-full overflow-hidden mb-2">
                    <div
                      className="progress-fill h-full bg-[var(--accento)] transition-all duration-300 ease-out"
                      style={{ width: `${((currentStep + 1) / passaggi.length) * 100}%` }}
                    />
                  </div>
                  <p className="progress-text text-sm text-[var(--secondario)] text-center">Passaggio {currentStep + 1} di {passaggi.length}</p>
                </div>
                <div className="cooking-step text-center mb-8">
                  {passaggi[currentStep].titolo && (
                    <h4 className="step-titolo text-xl font-semibold text-[var(--testo)] mb-3">{passaggi[currentStep].titolo}</h4>
                  )}
                  <p className="step-text text-lg text-[var(--testo)] leading-relaxed mb-6">{passaggi[currentStep].testo}</p>
                  {passaggi[currentStep].video_secondi && recipe.fonte_url && (
                    <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--accento)] hover:underline">
                      <MessageSquare size={20} /> Guarda nel video al {passaggi[currentStep].video_secondi}s
                    </a>
                  )}
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
                    <span className="step-number w-8 h-8 rounded-full bg-[var(--accento)] text-[var(--accento-test)] flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                      {i + 1}
                    </span>
                    <div className="step-content flex-1">
                      {step.titolo && <h4 className="step-titolo text-lg font-semibold text-[var(--testo)] mb-2">{step.titolo}</h4>}
                      <p className="text-[var(--testo)] leading-relaxed mb-2">{step.testo}</p>
                      {step.video_secondi && recipe.fonte_url && (
                        <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accento)] text-sm hover:underline">
                          <MessageSquare size={16} /> Guarda nel video al {step.video_secondi}s
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* "La faccio!" button */}
        {isAuthorized && recipe.stato !== 'da_completare' && (
          <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
            <Button variant="primary" size="lg" className="w-full" onClick={handleMarkMade}>
              <Check size={20} className="mr-2" /> La faccio! (aggiorna contatore)
            </Button>
          </section>
        )}

        {/* AI Chat placeholder - FASE C */}
        {/* <AIChat recipeId={recipe.id} /> */}
      </main>

      {/* Modalità cucina overlay per mobile */}
      {cookingMode && (
        <div className="cooking-overlay fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setCookingMode(false)} aria-hidden="true">
          <div className="cooking-overlay-content absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-[var(--card)] rounded-t-3xl border-t-2 border-[var(--accento)]" onClick={e => e.stopPropagation()}>
            <div className="p-4 pb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--testo)]">Modalità cucina</h2>
                <Button variant="ghost" size="sm" onClick={() => setCookingMode(false)}>
                  <X size={24} />
                </Button>
              </div>
              <div className="cooking-progress mb-6">
                <div className="progress-bar h-2 bg-[var(--bordo)] rounded-full overflow-hidden mb-2">
                  <div
                    className="progress-fill h-full bg-[var(--accento)] transition-all duration-300 ease-out"
                    style={{ width: `${((currentStep + 1) / passaggi.length) * 100}%` }}
                  />
                </div>
                <p className="progress-text text-sm text-[var(--secondario)] text-center">Passaggio {currentStep + 1} di {passaggi.length}</p>
              </div>
              <div className="cooking-step text-center mb-8">
                {passaggi[currentStep]?.titolo && (
                  <h4 className="step-titolo text-xl font-semibold text-[var(--testo)] mb-3">{passaggi[currentStep]!.titolo}</h4>
                )}
                <p className="cooking-step-text text-lg text-[var(--testo)] leading-relaxed mb-6">{passaggi[currentStep]?.testo}</p>
                {passaggi[currentStep]?.video_secondi && recipe.fonte_url && (
                  <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--accento)] hover:underline">
                    <MessageSquare size={20} /> Guarda nel video al {passaggi[currentStep]!.video_secondi}s
                  </a>
                )}
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