/**
 * Pagina Dettaglio Ricetta con modalità cucina, scaling porzioni, ingredienti spuntabili
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, Clock, Users, Tag, Heart, AlertCircle,
  ChefHat, X, Check, ChevronUp, ChevronDown,
  Plus, Minus, Edit, Trash2, MessageSquare, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { getRecipeById, incrementRecipeMade, deleteRecipe } from '../lib/supabase'
import {
  CATEGORIE_LABELS, MOOD_LABELS, STATO_LABELS,
  GRUPPI_INGREDIENTI, type Mood
} from '../lib/config'
import { type Ingrediente, type Passaggio, type Variante, normalizeRecipeFromDb } from '../lib/types'

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

  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [porzioni, setPorzioni] = useState<number>(1)
  const [cookingMode, setCookingMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const isAuthorized = user !== null

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

  const handleDelete = async () => {
    if (!recipe || !isAuthorized) return
    if (!window.confirm('Eliminare definitivamente questa ricetta?')) return
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      navigate('/')
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore durante l\'eliminazione')
    } finally {
      setDeleting(false)
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
        <header className="detail-header">
          <button className="btn-back" aria-label="Indietro"><ChevronLeft size={24} /></button>
          <div className="loading-skeleton">
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        </header>
        <main className="detail-content">
          <div className="skeleton-card">
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line" style={{ width: '50%' }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
          </div>
        </main>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="page-container detail-page">
        <header className="detail-header">
          <button className="btn-back" onClick={() => navigate(-1)} aria-label="Indietro"><ChevronLeft size={24} /></button>
        </header>
        <main className="detail-content">
          <div className="error-state card">
            <AlertCircle size={48} />
            <h2>{error || 'Ricetta non trovata'}</h2>
            <button className="btn-primary" onClick={() => navigate('/')}>Torna all'elenco</button>
          </div>
        </main>
      </div>
    )
  }

  const moodLabel = recipe.mood && recipe.mood in MOOD_LABELS ? MOOD_LABELS[recipe.mood as Mood] : '—'
  const categoriaLabel = recipe.categoria ? CATEGORIE_LABELS[recipe.categoria as keyof typeof CATEGORIE_LABELS] : '—'
  // const tags = recipe.tags || [] // unused
  const passaggi = recipe.passaggi || []

  return (
    <div className="page-container detail-page">
      {/* Header */}
      <header className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)} aria-label="Indietro">
          <ChevronLeft size={24} />
        </button>
        <div className="header-info">
          <h1>{recipe.titolo}</h1>
          <div className="recipe-meta-inline">
            {recipe.categoria && (
              <span className="meta-chip"><Tag size={14} /> {categoriaLabel}</span>
            )}
            {recipe.mood && (
              <span className="meta-chip"><Heart size={14} /> {moodLabel}</span>
            )}
            {recipe.stato === 'da_completare' && (
              <span className="meta-chip warning"><AlertCircle size={14} /> {STATO_LABELS.da_completare}</span>
            )}
          </div>
        </div>
        {isAuthorized && (
          <div className="header-actions">
            <Link to={`/edit/${recipe.id}`} className="btn-icon" aria-label="Modifica">
              <Edit size={20} />
            </Link>
            <button className="btn-icon danger" onClick={handleDelete} disabled={deleting} aria-label="Elimina">
              {deleting ? <Loader2 size={20} className="spin" /> : <Trash2 size={20} />}
            </button>
          </div>
        )}
      </header>

      <main className="detail-content">
        {/* Info principali */}
        <section className="card detail-info">
          <div className="info-grid">
            {recipe.tempo_minuti && (
              <div className="info-item">
                <Clock size={20} />
                <div>
                  <span className="info-label">Tempo</span>
                  <span className="info-value">{recipe.tempo_minuti} min</span>
                </div>
              </div>
            )}
            {recipe.porzioni && (
              <div className="info-item">
                <Users size={20} />
                <div>
                  <span className="info-label">Porzioni</span>
                  <span className="info-value">
                    <div className="porzioni-control">
                      <button className="btn-porzioni" onClick={() => handlePorzioniChange(-1)} aria-label="Meno porzioni"><Minus size={16} /></button>
                      <span className="porzioni-value">{porzioni} {recipe.porzioni_unita || 'porzioni'}</span>
                      <button className="btn-porzioni" onClick={() => handlePorzioniChange(1)} aria-label="Più porzioni"><Plus size={16} /></button>
                    </div>
                  </span>
                </div>
              </div>
            )}
            {recipe.autore && (
              <div className="info-item full-width">
                <span className="info-label">Autore</span>
                <span className="info-value">{recipe.autore}</span>
              </div>
            )}
            {recipe.volte_fatta && recipe.volte_fatta > 0 && (
              <div className="info-item full-width">
                <span className="info-label">Fatta {recipe.volte_fatta} volte</span>
                <span className="info-value">Ultima: {formatDate(recipe.ultima_volta)}</span>
              </div>
            )}
          </div>

          {recipe.descrizione && (
            <div className="note-section">
              <h3>Descrizione</h3>
              <p>{recipe.descrizione}</p>
            </div>
          )}

          {recipe.varianti && recipe.varianti.length > 0 && (
            <div className="varianti-section">
              <h3>Varianti</h3>
              <ul>
                {recipe.varianti.map((v, i) => (
                  <li key={i} className="variante-item">
                    {v.titolo && <strong>{v.titolo}: </strong>}
                    <span>{v.testo}</span>
                    {v.video_secondi && recipe.fonte_url && (
                      <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="btn-video-link">
                        <MessageSquare size={16} /> Guarda nel video al {v.video_secondi}s
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.note && (
            <div className="note-section">
              <h3>Note</h3>
              <p>{recipe.note}</p>
            </div>
          )}

          {recipe.fonte_url && (
            <div className="note-section">
              <h3>Fonte</h3>
              <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="btn-video-link">
                <MessageSquare size={18} /> {recipe.fonte_url}
              </a>
            </div>
          )}
        </section>

        {/* Pulsante "Completa" per ricette da completare */}
        {recipe.stato === 'da_completare' && isAuthorized && (
          <section className="card detail-actions">
            <Link to={`/edit/${recipe.id}`} className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
              <Edit size={20} /> Completa questa ricetta
            </Link>
          </section>
        )}

        {/* Ingredienti */}
        <section className="card detail-ingredients">
          <div className="section-header">
            <h2>Ingredienti</h2>
            {Object.keys(groupedIngredients).length > 0 && (
              <button
                className={clsx('btn-clear-checked', checkedIngredients.size > 0 && 'has-checked')}
                onClick={() => setCheckedIngredients(new Set())}
              >
                {checkedIngredients.size > 0 ? `Deseleziona tutto (${checkedIngredients.size})` : 'Deseleziona tutto'}
              </button>
            )}
          </div>

          {Object.entries(groupedIngredients).map(([gruppo, ingredients]) => (
            <div key={gruppo} className="ingredient-group">
              <h3 className="group-title">{(GRUPPI_INGREDIENTI as readonly string[]).includes(gruppo) ? gruppo.charAt(0).toUpperCase() + gruppo.slice(1) : gruppo}</h3>
              <ul className="ingredients-list">
                {ingredients.map(ing => (
                  <li key={`${ing.nome}-${ing.unita}-${ing.gruppo}`} className="ingredient-item">
                    <label className="ingredient-checkbox">
                      <input
                        type="checkbox"
                        checked={checkedIngredients.has(ing.nome)}
                        onChange={() => handleIngredientToggle(ing.nome)}
                      />
                      <span className="checkmark"></span>
                    </label>
                    <div className="ingredient-details">
                      <span className="ingredient-name">{ing.nome}</span>
                      <span className="ingredient-qty">{ing.quantita_scalata} {ing.unita}</span>
                    </div>
                    {ing.note && <span className="ingredient-note">({ing.note})</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {recipe.stato === 'da_completare' && (
            <p className="da-completare-notice">Ricetta da completare: mancano ingredienti dettagliati e passaggi.</p>
          )}
        </section>

        {/* Passaggi */}
        {recipe.stato !== 'da_completare' && passaggi.length > 0 && (
          <section className={clsx('card detail-steps', cookingMode && 'cooking-mode')}>
            <div className="section-header">
              <h2>Procedimento</h2>
              <button
                className={clsx('btn-cooking-mode', cookingMode && 'active')}
                onClick={() => {
                  setCookingMode(!cookingMode)
                  if (!cookingMode) setCurrentStep(0)
                }}
              >
                <ChefHat size={18} />
                {cookingMode ? 'Esci modalità cucina' : 'Modalità cucina'}
              </button>
            </div>

            {cookingMode ? (
              <div className="cooking-mode-view">
                <div className="cooking-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${((currentStep + 1) / passaggi.length) * 100}%` }} />
                  </div>
                  <span className="progress-text">Passaggio {currentStep + 1} di {passaggi.length}</span>
                </div>
                <div className="cooking-step">
                  {passaggi[currentStep].titolo && <h4 className="step-titolo">{passaggi[currentStep].titolo}</h4>}
                  <p className="step-text">{passaggi[currentStep].testo}</p>
                  {passaggi[currentStep].video_secondi && recipe.fonte_url && (
                    <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="btn-video-link">
                      <MessageSquare size={18} /> Guarda nel video al {passaggi[currentStep].video_secondi}s
                    </a>
                  )}
                </div>
                <div className="cooking-nav">
                  <button
                    className="btn-nav"
                    onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                  >
                    <ChevronUp size={24} /> Indietro
                  </button>
                  <button
                    className="btn-nav primary"
                    onClick={() => setCurrentStep(prev => Math.min(passaggi.length - 1, prev + 1))}
                    disabled={currentStep === passaggi.length - 1}
                  >
                    Avanti <ChevronDown size={24} />
                  </button>
                </div>
              </div>
            ) : (
              <ol className="steps-list">
                {passaggi.map((step, i) => (
                  <li key={i} className="step-item">
                    <span className="step-number">{i + 1}</span>
                    <div className="step-content">
                      {step.titolo && <h4 className="step-titolo">{step.titolo}</h4>}
                      <p>{step.testo}</p>
                      {step.video_secondi && recipe.fonte_url && (
                        <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="step-video">
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
          <section className="card detail-actions">
            <button className="btn-made" onClick={handleMarkMade}>
              <Check size={20} /> La faccio! (aggiorna contatore)
            </button>
          </section>
        )}

        {/* AI Chat placeholder - FASE C */}
        {/* <AIChat recipeId={recipe.id} /> */}
      </main>

      {/* Modalità cucina overlay per mobile */}
      {cookingMode && (
        <div className="cooking-overlay" onClick={() => setCookingMode(false)} aria-hidden="true">
          <div className="cooking-overlay-content" onClick={e => e.stopPropagation()}>
            <button className="close-cooking" onClick={() => setCookingMode(false)} aria-label="Chiudi modalità cucina">
              <X size={24} />
            </button>
            <div className="cooking-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentStep + 1) / passaggi.length) * 100}%` }} />
              </div>
              <span>Passaggio {currentStep + 1} di {passaggi.length}</span>
            </div>
            <div className="cooking-step">
              {passaggi[currentStep]?.titolo && <h4 className="step-titolo">{passaggi[currentStep]!.titolo}</h4>}
              <p className="cooking-step-text">{passaggi[currentStep]?.testo}</p>
              {passaggi[currentStep]?.video_secondi && recipe.fonte_url && (
                <a href={recipe.fonte_url} target="_blank" rel="noopener noreferrer" className="btn-video-link">
                  <MessageSquare size={18} /> Guarda nel video al {passaggi[currentStep]!.video_secondi}s
                </a>
              )}
            </div>
            <div className="cooking-nav">
              <button className="btn-nav" onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0}>
                <ChevronUp size={24} />
              </button>
              <button className="btn-nav primary" onClick={() => setCurrentStep(prev => Math.min(passaggi.length - 1, prev + 1))} disabled={currentStep === passaggi.length - 1}>
                <ChevronDown size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}