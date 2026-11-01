/**
 * Form Ricetta: add/edit con react-hook-form + zod validation
 * Supporta modalità "Da completare" (solo titolo) e completa
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Plus, GripVertical, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { getRecipeById, createRecipe, updateRecipe, getAllIngredients } from '../lib/supabase'
import {
  CATEGORIE, CATEGORIE_LABELS, ALL_TAGS, TAG_LABELS, MOODS, MOOD_LABELS,
  COMMON_UNITS, COMMON_GROUPS, STATO_RICETTA, STATO_LABELS, DEFAULT_PORZIONI_UNITA,
  type Mood
} from '../lib/config'
import type { RecipeInsert, RecipeUpdate } from '../lib/supabase'

// Helper per validazione enum-like con array readonly
const enumValidator = <T extends readonly string[]>(values: T, fieldName: string) =>
  z.string().refine(
    (val) => values.includes(val as T[number]),
    { message: `${fieldName} non valido` }
  )

// Schema Zod per validazione
const ingredienteSchema = z.object({
  nome: z.string().min(1, 'Nome ingrediente obbligatorio'),
  quantita: z.union([z.number().min(0), z.string()]).optional(),
  unita: z.string().optional(),
  gruppo: z.string().optional(),
  note: z.string().optional(),
})

const passaggioSchema = z.object({
  testo: z.string().min(1, 'Testo passaggio obbligatorio'),
  video_url: z.string().url('URL non valido').optional().or(z.literal('')),
})

const recipeFormSchema = z.object({
  titolo: z.string().min(1, 'Titolo obbligatorio'),
  autore: z.string().optional(),
  stato: enumValidator(STATO_RICETTA, 'Stato'),
  categoria: enumValidator(CATEGORIE, 'Categoria').optional(),
  mood: enumValidator(MOODS, 'Mood').optional(),
  tags: z.array(enumValidator(ALL_TAGS, 'Tag')).min(0), // required array (can be empty)
  tempo_minuti: z.number().min(1).max(1440).optional().nullable(),
  porzioni: z.number().min(1).max(100).optional().nullable(),
  porzioni_unita: z.string().min(1), // required string
  ingredienti: z.array(ingredienteSchema).min(0), // required array
  passaggi: z.array(passaggioSchema).min(0), // required array
  varianti: z.array(z.string()).min(0), // required array
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.stato === 'completa') {
    if (!data.categoria) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Categoria obbligatoria per ricette complete', path: ['categoria'] })
    }
    if (!data.mood) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mood obbligatorio per ricette complete', path: ['mood'] })
    }
    if (!data.ingredienti || data.ingredienti.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Almeno un ingrediente obbligatorio', path: ['ingredienti'] })
    }
    if (!data.passaggi || data.passaggi.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Almeno un passaggio obbligatorio', path: ['passaggi'] })
    }
  }
})

type RecipeFormData = z.infer<typeof recipeFormSchema>

interface RecipeFormComponentProps {
  isEditing: boolean
}

function RecipeFormComponent({ isEditing }: RecipeFormComponentProps) {
  const { user } = useAuth()
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
    formState: { errors, isValid },
    reset,
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      titolo: '',
      autore: '',
      stato: 'completa',
      categoria: undefined,
      mood: undefined,
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
  const watchedStato = watch('stato')

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
            // Cast dei campi Json dal database ai tipi del form
            // Converte null in undefined per i campi opzionali
            const ingredienti = ((data.ingredienti as unknown as Array<{ nome: string; quantita?: number | string | null; unita?: string | null; gruppo?: string | null; note?: string | null }>) || [])
              .map(ing => ({
                nome: ing.nome,
                quantita: ing.quantita ?? undefined,
                unita: ing.unita ?? undefined,
                gruppo: ing.gruppo ?? undefined,
                note: ing.note ?? undefined,
              }))
            const passaggi = ((data.passaggi as unknown as Array<{ testo: string; video_url?: string | null }>) || [])
              .map(p => ({
                testo: p.testo,
                video_url: p.video_url ?? undefined,
              }))
            const varianti = (data.varianti as unknown as string[]) || []
            const tags = (data.tags as unknown as string[]) || []

            reset({
              titolo: data.titolo || '',
              autore: data.autore || '',
              stato: data.stato || 'completa',
              categoria: data.categoria ?? undefined,
              mood: data.mood ?? undefined,
              tags,
              tempo_minuti: data.tempo_minuti ?? null,
              porzioni: data.porzioni ?? null,
              porzioni_unita: data.porzioni_unita || DEFAULT_PORZIONI_UNITA,
              ingredienti,
              passaggi,
              varianti,
              note: data.note || '',
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

  const isComplete = watchedStato === 'completa'

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
    appendStep({ testo: '', video_url: '' })
  }

  const handleTagToggle = (tag: typeof ALL_TAGS[number]) => {
    const current = watch('tags') || []
    setValue('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }

  const onSubmit = async (data: RecipeFormData) => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...data,
        ingredienti: data.ingredienti.map(ing => ({
          ...ing,
          nome: ing.nome.toLowerCase().trim(),
          quantita: typeof ing.quantita === 'string' && ing.quantita.trim() === '' ? null : ing.quantita,
          unita: ing.unita?.trim() || null,
          gruppo: ing.gruppo?.trim() || null,
          note: ing.note?.trim() || null,
        })),
        passaggi: data.passaggi.map(p => ({
          testo: p.testo.trim(),
          video_url: p.video_url?.trim() || null,
        })),
        varianti: data.varianti.map(v => v.trim()).filter(Boolean),
        tags: data.tags,
      }

      if (isEditing && id) {
        await updateRecipe(id, payload as RecipeUpdate)
      } else {
        await createRecipe(payload as RecipeInsert)
      }
      navigate('/')
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setError('Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container form-page">
        <header className="form-header">
          <button className="btn-back" disabled><ChevronLeft size={24} /></button>
          <div className="loading-skeleton">
            <div className="skeleton-line" style={{ width: '50%' }} />
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="page-container form-page">
      <header className="form-header">
        <button className="btn-back" onClick={() => navigate(-1)} aria-label="Indietro">
          <ChevronLeft size={24} />
        </button>
        <h1>{isEditing ? 'Modifica ricetta' : 'Nuova ricetta'}</h1>
        <div className="header-spacer" />
      </header>

      <form onSubmit={handleSubmit(onSubmit as any)} className="form-content" noValidate>
        {error && <div className="form-error"><AlertCircle size={18} /> {error}</div>}

        {/* Titolo (sempre obbligatorio) */}
        <section className="form-section card">
          <div className="form-field">
            <label htmlFor="titolo">Titolo *</label>
            <input
              id="titolo"
              type="text"
              placeholder="Es. Carbonara classica"
              {...register('titolo')}
              className={clsx('form-input', errors.titolo && 'error')}
            />
            {errors.titolo && <span className="field-error">{errors.titolo.message}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="autore">Autore</label>
            <input
              id="autore"
              type="text"
              placeholder="Es. Nonna Maria"
              {...register('autore')}
              className="form-input"
            />
          </div>
        </section>

        {/* Stato */}
        <section className="form-section card">
          <fieldset>
            <legend>Stato ricetta *</legend>
            <div className="radio-group">
              {STATO_RICETTA.map(stato => (
                <label key={stato} className="radio-label">
                  <input
                    type="radio"
                    value={stato}
                    {...register('stato')}
                    className="radio-input"
                  />
                  <span>{STATO_LABELS[stato as keyof typeof STATO_LABELS]}</span>
                </label>
              ))}
            </div>
            {errors.stato && <span className="field-error">{errors.stato.message}</span>}
          </fieldset>

          {isComplete && (
            <p className="form-hint">
              <CheckCircle size={16} className="hint-icon" /> Modalità completa: servono categoria, mood, almeno un ingrediente e un passaggio.
            </p>
          )}
          {!isComplete && (
            <p className="form-hint warning">
              <AlertCircle size={16} className="hint-icon" /> Modalità "Da completare": solo il titolo è obbligatorio. Potrai completare dopo.
            </p>
          )}
        </section>

        {/* Campi solo per ricette complete */}
        {isComplete && (
          <>
            <section className="form-section card">
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="categoria">Categoria *</label>
                  <select id="categoria" {...register('categoria')} className={clsx('form-select', errors.categoria && 'error')}>
                    <option value="">Seleziona categoria</option>
                    {CATEGORIE.map(cat => (
                      <option key={cat} value={cat}>{CATEGORIE_LABELS[cat]}</option>
                    ))}
                  </select>
                  {errors.categoria && <span className="field-error">{errors.categoria.message}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="mood">Mood *</label>
                  <select id="mood" {...register('mood')} className={clsx('form-select', errors.mood && 'error')}>
                    <option value="">Seleziona mood</option>
                    {MOODS.map(m => (
                      <option key={m} value={m}>{MOOD_LABELS[m as Mood]}</option>
                    ))}
                  </select>
                  {errors.mood && <span className="field-error">{errors.mood.message}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="tempo_minuti">Tempo (minuti)</label>
                  <input
                    id="tempo_minuti"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    placeholder="30"
                    {...register('tempo_minuti', { valueAsNumber: true })}
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="porzioni">Porzioni</label>
                  <input
                    id="porzioni"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    placeholder="4"
                    {...register('porzioni', { valueAsNumber: true })}
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="porzioni_unita">Unità</label>
                  <input
                    id="porzioni_unita"
                    type="text"
                    placeholder="porzioni"
                    {...register('porzioni_unita')}
                    className="form-input"
                  />
                </div>
              </div>
            </section>

            {/* Tag */}
            <section className="form-section card">
              <label>Tag</label>
              <div className="tag-checkboxes">
                {ALL_TAGS.map(tag => (
                  <label key={tag} className="tag-checkbox">
                    <Controller
                      name="tags"
                      control={control}
                      rules={{ required: false }}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value?.includes(tag) || false}
                          onChange={() => handleTagToggle(tag)}
                        />
                      )}
                    />
                    <span>{TAG_LABELS[tag]}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Ingredienti */}
            <section className="form-section card">
              <div className="section-header">
                <h2>Ingredienti <span className="required">*</span></h2>
                <button type="button" className="btn-add" onClick={handleAddIngredient}>
                  <Plus size={18} /> Aggiungi
                </button>
              </div>

              {errors.ingredienti && <span className="field-error">{errors.ingredienti.message}</span>}

              <ul className="form-array">
                {ingredientFields.map((field, index) => (
                  <li key={field.id} className="array-item ingredient-row">
                    <button
                      type="button"
                      className="drag-handle"
                      onMouseDown={e => { e.preventDefault(); }}
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="ingredient-fields">
                      <div className="form-field flex-1">
                        <label htmlFor={`ing-${index}-nome`}>Nome *</label>
                        <div className="autocomplete-wrapper">
                          <input
                            id={`ing-${index}-nome`}
                            type="text"
                            placeholder="Es. spaghetti"
                            {...register(`ingredienti.${index}.nome`)}
                            className={clsx('form-input', errors.ingredienti?.[index]?.nome && 'error')}
                            onFocus={() => setShowAutocomplete(`ing-${index}`)}
                            onBlur={() => setTimeout(() => setShowAutocomplete(null), 200)}
                            autoComplete="off"
                          />
                          {showAutocomplete === `ing-${index}` && (
                            <ul className="autocomplete-dropdown">
                              {filteredIngredients(watch(`ingredienti.${index}.nome`) || '').map((ing, i) => (
                                <li key={i} onClick={() => handleIngredientSelect(index, ing)}>{ing}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {errors.ingredienti?.[index]?.nome && (
                          <span className="field-error">{errors.ingredienti[index].nome.message}</span>
                        )}
                      </div>

                      <div className="form-field qty-field">
                        <label>Quantità</label>
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
                              className="form-input"
                            />
                          )}
                        />
                      </div>

                      <div className="form-field unit-field">
                        <label>Unità</label>
                        <select {...register(`ingredienti.${index}.unita`)} className="form-select">
                          <option value="">—</option>
                          {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>

                      <div className="form-field">
                        <label>Gruppo</label>
                        <select {...register(`ingredienti.${index}.gruppo`)} className="form-select">
                          <option value="">—</option>
                          {COMMON_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeIngredient(index)}
                        aria-label="Rimuovi ingrediente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {ingredientFields.length === 0 && (
                <p className="empty-hint">Nessun ingrediente. Clicca "Aggiungi" per iniziare.</p>
              )}
            </section>

            {/* Passaggi */}
            <section className="form-section card">
              <div className="section-header">
                <h2>Passaggi <span className="required">*</span></h2>
                <button type="button" className="btn-add" onClick={handleAddStep}>
                  <Plus size={18} /> Aggiungi
                </button>
              </div>

              {errors.passaggi && <span className="field-error">{errors.passaggi.message}</span>}

              <ol className="form-array steps-array">
                {stepFields.map((field, index) => (
                  <li key={field.id} className="array-item step-row">
                    <button
                      type="button"
                      className="drag-handle"
                      onMouseDown={e => { e.preventDefault(); }}
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="step-fields">
                      <span className="step-index">{index + 1}.</span>

                      <div className="form-field flex-1">
                        <label htmlFor={`step-${index}-testo`}>Testo *</label>
                        <textarea
                          id={`step-${index}-testo`}
                          rows={3}
                          placeholder="Descrizione del passaggio..."
                          {...register(`passaggi.${index}.testo`)}
                          className={clsx('form-textarea', errors.passaggi?.[index]?.testo && 'error')}
                        />
                        {errors.passaggi?.[index]?.testo && (
                          <span className="field-error">{errors.passaggi[index].testo.message}</span>
                        )}
                      </div>

                      <div className="form-field video-field">
                        <label htmlFor={`step-${index}-video`}>Video URL</label>
                        <input
                          id={`step-${index}-video`}
                          type="url"
                          placeholder="https://youtube.com/..."
                          {...register(`passaggi.${index}.video_url`)}
                          className={clsx('form-input', errors.passaggi?.[index]?.video_url && 'error')}
                        />
                        {errors.passaggi?.[index]?.video_url && (
                          <span className="field-error">{errors.passaggi[index].video_url.message}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeStep(index)}
                        aria-label="Rimuovi passaggio"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>

              {stepFields.length === 0 && (
                <p className="empty-hint">Nessun passaggio. Clicca "Aggiungi" per iniziare.</p>
              )}
            </section>

            {/* Varianti */}
            <section className="form-section card">
              <label>Varianti (opzionale)</label>
              <Controller
                name="varianti"
                control={control}
                rules={{ required: false }}
                render={({ field }) => (
                  <textarea
                    placeholder="Una variante per riga (es. Versione vegetariana: tofu al posto della pancetta)"
                    value={field.value?.join('\n') || ''}
                    onChange={e => field.onChange(e.target.value.split('\n').map(v => v.trim()).filter(Boolean))}
                    rows={4}
                    className="form-textarea"
                  />
                )}
              />
              <p className="form-hint">Una variante per riga.</p>
            </section>

            {/* Note */}
            <section className="form-section card">
              <label>Note (opzionale)</label>
              <textarea
                {...register('note')}
                placeholder="Note, consigli, abbinamenti..."
                rows={3}
                className="form-textarea"
              />
            </section>
          </>
        )}

        {/* Pulsanti salvataggio */}
        <footer className="form-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Annulla
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!isValid || saving || !user}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />}
            {isEditing ? 'Salva modifiche' : 'Crea ricetta'}
          </button>
        </footer>

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