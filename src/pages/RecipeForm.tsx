/**
 * Form Ricetta: add/edit con react-hook-form + zod validation
 * Supporta modalità "Da completare" (solo titolo) e completa
 * Usa componenti condivisi: Button, Badge
 * NOTA: Header e Mood Bar ora sono nel Layout component
 * NOTA: Rimossi campi video_secondi e fonte_url
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, GripVertical, Trash2, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { useMood } from '../contexts/MoodContext'
import { getRecipeById, createRecipe, updateRecipe, getAllIngredients } from '../lib/supabase'
import {
  CATEGORIE, CATEGORIE_LABELS, ALL_TAGS, TAG_LABELS, MOODS, MOOD_LABELS,
  COMMON_UNITS, COMMON_GROUPS, STATO_RICETTA, STATO_LABELS, DEFAULT_PORZIONI_UNITA,
  DIFFICOLTA, DIFFICOLTA_LABELS,
  type Mood
} from '../lib/config'
import type { RecipeInsert, RecipeUpdate } from '../lib/supabase'
import {
  recipeFormSchema,
  type RecipeFormData,
  prepareRecipeForDb,
  normalizeRecipeFromDb,
} from '../lib/types'
import { Button } from '../components/Button'

interface RecipeFormComponentProps {
  isEditing: boolean
}

function RecipeFormComponent({ isEditing }: RecipeFormComponentProps) {
  const { user } = useAuth()
  const { mood } = useMood()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allIngredients, setAllIngredients] = useState<string[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
    reset,
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema) as any,
    defaultValues: {
      titolo: '',
      autore: '',
      stato: 'completa',
      categoria: undefined,
      mood: isEditing ? undefined : (mood !== 'tutti' ? mood : undefined),
      difficolta: '',
      tags: [],
      tempo_minuti: null,
      porzioni: null,
      porzioni_unita: DEFAULT_PORZIONI_UNITA,
      ingredienti: [],
      passaggi: [],
      varianti: [],
      note: '',
    },
    mode: 'onChange',
  })

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({ control, name: 'ingredienti' })
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'passaggi' })
  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({ control, name: 'varianti' })

  // Carica ingredienti per autocomplete
  useEffect(() => {
    getAllIngredients().then(setAllIngredients).catch(console.error)
  }, [])

  // Carica ricetta se editing
  useEffect(() => {
    if (isEditing && id) {
      const load = async () => {
        setLoading(true)
        try {
          const data = await getRecipeById(id)
          if (data) {
            const formData = normalizeRecipeFromDb(data)
            reset({
              ...formData,
              categoria: formData.categoria ?? undefined,
              mood: formData.mood ?? undefined,
              // Nessun default forzato: se nel DB è null resta la selezione vuota
              difficolta: formData.difficolta ?? '',
              tempo_minuti: formData.tempo_minuti ?? null,
              porzioni: formData.porzioni ?? null,
              note: formData.note ?? '',
            })
          }
        } catch (err) {
          setError('Errore caricamento ricetta')
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      load()
    }
  }, [isEditing, id, reset])

  const filteredIngredients = useCallback((input: string) => {
    if (!input) return allIngredients
    const lower = input.toLowerCase()
    return allIngredients.filter(ing => ing.toLowerCase().includes(lower)).slice(0, 10)
  }, [allIngredients])

  const handleIngredientSelect = (index: number, value: string) => {
    setValue(`ingredienti.${index}.nome`, value, { shouldValidate: true })
    setShowAutocomplete(null)
  }

  const handleAddIngredient = () => {
    appendIngredient({ nome: '', quantita: '', unita: '', gruppo: '', note: '' })
  }

  const handleAddStep = () => {
    appendStep({ titolo: '', testo: '' })
  }

  const handleAddVariant = () => {
    appendVariant({ titolo: '', testo: '' })
  }

  const handleTagToggle = (tag: typeof ALL_TAGS[number]) => {
    const current = watch('tags') || []
    setValue('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }

  const onSubmit = async (data: RecipeFormData) => {
    if (!user) return
    setSaving(true)
    setError(null)
    console.log('1. Form raw data:', getValues())
    console.log('2. Zod validated data:', data)
    const payload = prepareRecipeForDb(data)
    console.log('3. Prepared DB payload:', payload)

    const save = async (p: typeof payload) => {
      if (isEditing && id) {
        await updateRecipe(id, p as RecipeUpdate)
      } else {
        await createRecipe(p as RecipeInsert)
      }
    }

    try {
      await save(payload)
      navigate('/')
    } catch (err) {
      // Se la colonna non esiste ancora nel DB (PGRST204, es. 'difficolta' prima
      // della migrazione), la rimuoviamo dal payload e riproviamo una volta.
      if ((err as { code?: string })?.code === 'PGRST204') {
        const e = err as { code?: string; message?: string; details?: string; hint?: string }
        const text = [e?.message, e?.details, e?.hint].filter(Boolean).join(' ')
        const match = text.match(/column [\w.]+\.?"?(\w+)"? does not exist/) || text.match(/'(\w+)' column/)
        const column = match?.[1]
        if (column && column in payload) {
          const rest: Record<string, unknown> = { ...(payload as Record<string, unknown>) }
          delete rest[column]
          try {
            await save(rest as typeof payload)
            navigate('/')
            return
          } catch (retryErr) {
            console.error('Errore salvataggio (retry senza colonna):', retryErr)
            err = retryErr
          }
        }
      }
      // Logging dettagliato errore Supabase per debug
      const e = err as { code?: string; message?: string; details?: string; hint?: string }
      console.error('Supabase Error:', e?.message, e?.details, e?.hint, e?.code)
      const detail = [e?.code, e?.message, e?.details, e?.hint].filter(Boolean).join(' — ')
      setError(detail ? `Errore durante il salvataggio: ${detail}` : 'Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container form-page">
        <div className="max-w-[720px] mx-auto px-4">
          <div className="loading-skeleton space-y-4">
            <div className="skeleton-card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 animate-pulse">
              <div className="h-6 w-3/4 bg-[var(--bordo)] rounded mb-2" />
              <div className="h-4 w-1/2 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/3 bg-[var(--bordo)] rounded mb-3" />
              <div className="h-4 w-1/4 bg-[var(--bordo)] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container form-page">
      <form onSubmit={handleSubmit(onSubmit as any)} className="form-content max-w-[720px] mx-auto px-4" noValidate>
        {error && (
          <div className="form-error card bg-[var(--card)] rounded-xl border border-[var(--bordo)] p-4 mb-4 flex items-start gap-2 text-[var(--accento)]">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Titolo (sempre obbligatorio) */}
        <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
          <div className="form-field">
            <label htmlFor="titolo" className="block text-sm font-medium text-[var(--testo)] mb-1">Titolo <span className="text-[var(--accento)]">*</span></label>
            <input
              id="titolo"
              type="text"
              placeholder="Es. Carbonara classica"
              {...register('titolo')}
              className={clsx('form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150', errors.titolo && 'border-[var(--accento)]')}
            />
            {errors.titolo && <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.titolo.message}</p>}
          </div>

          <div className="form-field mt-4">
            <label htmlFor="autore" className="block text-sm font-medium text-[var(--testo)] mb-1">Autore</label>
            <input
              id="autore"
              type="text"
              placeholder="Es. Nonna Maria"
              {...register('autore')}
              className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
            />
          </div>
        </section>

        {/* Stato */}
        <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
          <fieldset>
            <legend className="block text-sm font-medium text-[var(--testo)] mb-3">Stato ricetta <span className="text-[var(--accento)]">*</span></legend>
            <div className="radio-group flex gap-6">
              {STATO_RICETTA.map(stato => (
                <label key={stato} className="radio-label flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={stato}
                    {...register('stato')}
                    className="radio-input w-4 h-4 text-[var(--accento)] border-[var(--bordo)] focus:ring-2 focus:ring-[var(--accento)] focus:ring-offset-2 focus:ring-offset-[var(--sfondo)]"
                  />
                  <span className="text-[var(--testo)]">{STATO_LABELS[stato as keyof typeof STATO_LABELS]}</span>
                </label>
              ))}
            </div>
            {errors.stato && <p className="field-error text-sm text-[var(--accento)] mt-2">{errors.stato.message}</p>}
          </fieldset>

          {/* Hint: solo titolo e autore obbligatori per tutte le ricette */}
          <p className="form-hint flex items-center gap-2 text-sm text-[var(--secondario)] mt-3 p-3 bg-[var(--sfondo)] rounded-xl border border-[var(--bordo)]">
            <Info size={16} className="hint-icon text-[var(--accento)] flex-shrink-0" />
            Solo titolo e autore sono obbligatori. Tutti gli altri campi sono facoltativi.
          </p>
        </section>

        {/* Campi opzionali per tutte le ricette */}
        <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
          <div className="form-row grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-field">
              <label htmlFor="categoria" className="block text-sm font-medium text-[var(--testo)] mb-1">Categoria</label>
              <select id="categoria" {...register('categoria')} className={clsx('form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none', errors.categoria && 'border-[var(--accento)]')}>
                <option value="">Seleziona categoria (facoltativo)</option>
                {CATEGORIE.map(cat => (
                  <option key={cat} value={cat}>{CATEGORIE_LABELS[cat]}</option>
                ))}
              </select>
              {errors.categoria && <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.categoria.message}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="mood" className="block text-sm font-medium text-[var(--testo)] mb-1">Mood</label>
              <select id="mood" {...register('mood')} className={clsx('form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none', errors.mood && 'border-[var(--accento)]')}>
                <option value="">Seleziona mood (facoltativo)</option>
                {MOODS.map(m => (
                  <option key={m} value={m}>{MOOD_LABELS[m as Mood]}</option>
                ))}
              </select>
              {errors.mood && <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.mood.message}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="difficolta" className="block text-sm font-medium text-[var(--testo)] mb-1">Difficoltà</label>
              <select id="difficolta" {...register('difficolta')} className={clsx('form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none', errors.difficolta && 'border-[var(--accento)]')}>
                <option value="">Seleziona difficoltà (facoltativo)</option>
                {DIFFICOLTA.map(d => (
                  <option key={d} value={d}>{DIFFICOLTA_LABELS[d]}</option>
                ))}
              </select>
              {errors.difficolta && <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.difficolta.message}</p>}
            </div>
          </div>

              <div className="form-row grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="form-field">
                  <label htmlFor="tempo_minuti" className="block text-sm font-medium text-[var(--testo)] mb-1">Tempo (minuti)</label>
                  <input
                    id="tempo_minuti"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    placeholder="30"
                    {...register('tempo_minuti', { valueAsNumber: true })}
                    className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="porzioni" className="block text-sm font-medium text-[var(--testo)] mb-1">Porzioni</label>
                  <input
                    id="porzioni"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    placeholder="4"
                    {...register('porzioni', { valueAsNumber: true })}
                    className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="porzioni_unita" className="block text-sm font-medium text-[var(--testo)] mb-1">Unità</label>
                  <input
                    id="porzioni_unita"
                    type="text"
                    placeholder="porzioni"
                    {...register('porzioni_unita')}
                    className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                  />
                </div>
              </div>
            </section>

            {/* Tag */}
            <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <label className="block text-sm font-medium text-[var(--testo)] mb-3">Tag</label>
              <div className="tag-checkboxes flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <label key={tag} className="tag-checkbox inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full bg-[var(--bordo)] text-[var(--secondario)] hover:bg-[var(--accento)]/10 transition-all duration-150">
                    <Controller
                      name="tags"
                      control={control}
                      rules={{ required: false }}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value?.includes(tag) || false}
                          onChange={() => handleTagToggle(tag)}
                          className="w-4 h-4 text-[var(--accento)] border-[var(--bordo)] rounded focus:ring-2 focus:ring-[var(--accento)] focus:ring-offset-2 focus:ring-offset-[var(--sfondo)]"
                        />
                      )}
                    />
                    <span className="text-sm">{TAG_LABELS[tag]}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Ingredienti */}
            <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <div className="section-header flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--testo)]">Ingredienti <span className="text-[var(--accento)]">*</span></h2>
                <Button variant="secondary" size="sm" onClick={handleAddIngredient} className="gap-2">
                  <Plus size={18} /> Aggiungi
                </Button>
              </div>

              {errors.ingredienti && <p className="field-error text-sm text-[var(--accento)] mb-3">{errors.ingredienti.message}</p>}

              <ul className="form-array space-y-4">
                {ingredientFields.map((field, index) => (
                  <li key={field.id} className="array-item ingredient-row flex gap-3 p-4 bg-[var(--sfondo)] rounded-xl">
                    <button
                      type="button"
                      className="drag-handle flex items-center justify-center p-2 text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--bordo)] rounded-lg transition-colors touch-manipulation"
                      onMouseDown={e => { e.preventDefault(); }}
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="ingredient-fields flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
                      <div className="form-field flex-1">
                        <label htmlFor={`ing-${index}-nome`} className="block text-sm font-medium text-[var(--testo)] mb-1">Nome <span className="text-[var(--accento)]">*</span></label>
                        <div className="autocomplete-wrapper relative">
                          <input
                            id={`ing-${index}-nome`}
                            type="text"
                            placeholder="Es. spaghetti"
                            {...register(`ingredienti.${index}.nome`)}
                            className={clsx('form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 pr-12', errors.ingredienti?.[index]?.nome && 'border-[var(--accento)]')}
                            onFocus={() => setShowAutocomplete(`ing-${index}`)}
                            onBlur={() => setTimeout(() => setShowAutocomplete(null), 200)}
                            autoComplete="off"
                          />
                          {showAutocomplete === `ing-${index}` && (
                            <ul className="autocomplete-dropdown absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--bordo)] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                              {filteredIngredients(watch(`ingredienti.${index}.nome`) || '').map((ing, i) => (
                                <li key={i} onClick={() => handleIngredientSelect(index, ing)} className="px-4 py-3 hover:bg-[var(--bordo)] cursor-pointer text-[var(--testo)] border-b border-[var(--bordo)] last:border-0">
                                  {ing}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {errors.ingredienti?.[index]?.nome && (
                          <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.ingredienti[index].nome.message}</p>
                        )}
                      </div>

                      <div className="form-field qty-field w-full sm:w-[100px]">
                        <label className="block text-sm font-medium text-[var(--testo)] mb-1">Quantità</label>
                        <Controller
                          name={`ingredienti.${index}.quantita`}
                          control={control}
                          rules={{ required: false }}
                          render={({ field }) => (
                            <input
                              type="text"
                              placeholder="Es. 200"
                              value={field.value ?? ''}
                              onChange={e => {
                                const val = e.target.value
                                const num = parseFloat(val.replace(',', '.'))
                                field.onChange(isNaN(num) ? val : num)
                              }}
                              className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                            />
                          )}
                        />
                      </div>

                      <div className="form-field unit-field w-full sm:w-[100px]">
                        <label className="block text-sm font-medium text-[var(--testo)] mb-1">Unità</label>
                        <select {...register(`ingredienti.${index}.unita`)} className="form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none">
                          <option value="">—</option>
                          {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>

                      <div className="form-field w-full sm:w-[120px]">
                        <label className="block text-sm font-medium text-[var(--testo)] mb-1">Gruppo</label>
                        <select {...register(`ingredienti.${index}.gruppo`)} className="form-select w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 appearance-none">
                          <option value="">—</option>
                          {COMMON_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        aria-label="Rimuovi ingrediente"
                        className="flex-shrink-0 self-end mb-1"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {ingredientFields.length === 0 && (
                <p className="empty-hint text-center text-[var(--secondario)] py-8">Nessun ingrediente. Clicca "Aggiungi" per iniziare.</p>
              )}
            </section>

            {/* Passaggi - RIMOSSO video_secondi */}
            <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <div className="section-header flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--testo)]">Passaggi <span className="text-[var(--accento)]">*</span></h2>
                <Button variant="secondary" size="sm" onClick={handleAddStep} className="gap-2">
                  <Plus size={18} /> Aggiungi
                </Button>
              </div>

              {errors.passaggi && <p className="field-error text-sm text-[var(--accento)] mb-3">{errors.passaggi.message}</p>}

              <ol className="form-array steps-array space-y-4">
                {stepFields.map((field, index) => (
                  <li key={field.id} className="array-item step-row flex gap-3 p-4 bg-[var(--sfondo)] rounded-xl">
                    <button
                      type="button"
                      className="drag-handle flex items-center justify-center p-2 text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--bordo)] rounded-lg transition-colors touch-manipulation"
                      onMouseDown={e => { e.preventDefault(); }}
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="step-fields flex-1 flex flex-col gap-4 min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="step-index text-lg font-bold text-[var(--accento)] flex-shrink-0 mt-1 w-8 text-right">{index + 1}.</span>

                        <div className="form-field flex-1">
                          <label htmlFor={`step-${index}-titolo`} className="block text-sm font-medium text-[var(--testo)] mb-1">Titolo (opzionale)</label>
                          <input
                            id={`step-${index}-titolo`}
                            type="text"
                            placeholder="Es. Preparazione impasto"
                            {...register(`passaggi.${index}.titolo`)}
                            className="form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150"
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor={`step-${index}-testo`} className="block text-sm font-medium text-[var(--testo)] mb-1">Testo <span className="text-[var(--accento)]">*</span></label>
                        <textarea
                          id={`step-${index}-testo`}
                          rows={3}
                          placeholder="Descrizione del passaggio..."
                          {...register(`passaggi.${index}.testo`)}
                          className={clsx('form-textarea w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 resize-y', errors.passaggi?.[index]?.testo && 'border-[var(--accento)]')}
                        />
                        {errors.passaggi?.[index]?.testo && (
                          <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.passaggi[index].testo.message}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        aria-label="Rimuovi passaggio"
                        className="self-end"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>

              {stepFields.length === 0 && (
                <p className="empty-hint text-center text-[var(--secondario)] py-8">Nessun passaggio. Clicca "Aggiungi" per iniziare.</p>
              )}
            </section>

            {/* Varianti - RIMOSSO video_secondi */}
            <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <div className="section-header flex items-center justify-between mb-4">
                <label className="text-lg font-semibold text-[var(--testo)]">Varianti (opzionale)</label>
                <Button variant="secondary" size="sm" onClick={handleAddVariant} className="gap-2">
                  <Plus size={18} /> Aggiungi
                </Button>
              </div>

              <ol className="form-array variants-array space-y-4">
                {variantFields.map((field, index) => (
                  <li key={field.id} className="array-item variant-row flex gap-3 p-4 bg-[var(--sfondo)] rounded-xl">
                    <button
                      type="button"
                      className="drag-handle flex items-center justify-center p-2 text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--bordo)] rounded-lg transition-colors touch-manipulation"
                      onMouseDown={e => { e.preventDefault(); }}
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="variant-fields flex-1 flex flex-col gap-4 min-w-0">
                      <div className="form-field flex-1">
                        <label htmlFor={`variant-${index}-titolo`} className="block text-sm font-medium text-[var(--testo)] mb-1">Titolo <span className="text-[var(--accento)]">*</span></label>
                        <input
                          id={`variant-${index}-titolo`}
                          type="text"
                          placeholder="Es. Versione vegetariana"
                          {...register(`varianti.${index}.titolo`)}
                          className={clsx('form-input w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150', errors.varianti?.[index]?.titolo && 'border-[var(--accento)]')}
                        />
                        {errors.varianti?.[index]?.titolo && (
                          <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.varianti[index].titolo.message}</p>
                        )}
                      </div>

                      <div className="form-field flex-1">
                        <label htmlFor={`variant-${index}-testo`} className="block text-sm font-medium text-[var(--testo)] mb-1">Testo <span className="text-[var(--accento)]">*</span></label>
                        <textarea
                          id={`variant-${index}-testo`}
                          rows={2}
                          placeholder="Descrizione della variante..."
                          {...register(`varianti.${index}.testo`)}
                          className={clsx('form-textarea w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--card)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 resize-y', errors.varianti?.[index]?.testo && 'border-[var(--accento)]')}
                        />
                        {errors.varianti?.[index]?.testo && (
                          <p className="field-error text-sm text-[var(--accento)] mt-1">{errors.varianti[index].testo.message}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        aria-label="Rimuovi variante"
                        className="self-end"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>

              {variantFields.length === 0 && (
                <p className="empty-hint text-center text-[var(--secondario)] py-8">Nessuna variante. Clicca "Aggiungi" per iniziare.</p>
              )}
            </section>

            {/* Note */}
            <section className="form-section card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
              <label className="block text-sm font-medium text-[var(--testo)] mb-2">Note (opzionale)</label>
              <textarea
                {...register('note')}
                placeholder="Note, consigli, abbinamenti..."
                rows={3}
                className="form-textarea w-full px-4 py-3 rounded-xl border border-[var(--bordo)] bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 resize-y"
              />
            </section>

        {/* Pulsanti salvataggio - flusso normale (non fixed) per evitare sovrapposizione con BottomNav */}
        <footer className="form-footer bg-[var(--sfondo)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--sfondo)]/80 border-t border-[var(--bordo)] p-4 pt-6 max-w-[720px] mx-auto">
          <div className="flex items-center justify-between gap-4">
            <Button variant="secondary" onClick={() => navigate(-1)} className="flex-1 touch-manipulation min-h-[44px]">
              Annulla
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!isValid || saving || !user}
              className="flex-1 gap-2 touch-manipulation min-h-[44px]"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {isEditing ? 'Salva modifiche' : 'Crea ricetta'}
            </Button>
          </div>
        </footer>

        {/* Spacer: spazio per far scorrere il footer sopra la BottomNav fissa (64px) + margine ampio */}
        <div className="h-40" aria-hidden="true" />

        {/* AI Import placeholder - FASE C */}
        {/* <AIImport onImport={data => reset(data)} /> */}
      </form>
    </div>
  )
}

export function RecipeForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  return <RecipeFormComponent isEditing={isEditing} />
}