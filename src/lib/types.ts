/**
 * Tipi unificati e validazione Zod per l'app Ricettario
 * Fonte unica di verità per: Ingrediente, Passaggio, Variante, Ricetta
 */

import { z } from 'zod'

// ============================================
// COSTANTI (da config.ts)
// ============================================

export const CATEGORIE = [
  'antipasti',
  'primi',
  'secondi',
  'contorni',
  'piatti_unici',
  'zuppe',
  'lievitati',
  'dolci',
  'colazione_merende',
  'salse_basi',
  'bevande',
] as const

export type Categoria = (typeof CATEGORIE)[number]

export const CATEGORIE_LABELS: Record<Categoria, string> = {
  antipasti: 'Antipasti',
  primi: 'Primi',
  secondi: 'Secondi',
  contorni: 'Contorni',
  piatti_unici: 'Piatti unici',
  zuppe: 'Zuppe',
  lievitati: 'Lievitati',
  dolci: 'Dolci',
  colazione_merende: 'Colazione e merende',
  salse_basi: 'Salse e basi',
  bevande: 'Bevande',
}

export const TAG_INGREDIENTE = [
  'carne',
  'pesce',
  'verdure',
  'legumi',
  'uova_latticini',
  'cereali',
  'frutta',
  'funghi',
] as const

export type TagIngrediente = (typeof TAG_INGREDIENTE)[number]

export const TAG_INGREDIENTE_LABELS: Record<TagIngrediente, string> = {
  carne: 'Carne',
  pesce: 'Pesce',
  verdure: 'Verdure',
  legumi: 'Legumi',
  uova_latticini: 'Uova e latticini',
  cereali: 'Cereali',
  frutta: 'Frutta',
  funghi: 'Funghi',
}

export const TAG_DIETA = [
  'vegetariano',
  'vegano',
  'senza_glutine',
  'senza_lattosio',
] as const

export type TagDieta = (typeof TAG_DIETA)[number]

export const TAG_DIETA_LABELS: Record<TagDieta, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  senza_glutine: 'Senza glutine',
  senza_lattosio: 'Senza lattosio',
}

export const ALL_TAGS = [...TAG_INGREDIENTE, ...TAG_DIETA] as const
export type Tag = (typeof ALL_TAGS)[number]

export const TAG_LABELS: Record<Tag, string> = {
  ...TAG_INGREDIENTE_LABELS,
  ...TAG_DIETA_LABELS,
}

export const MOODS = [
  'gourmet',
  'pasticceria',
  'comfort',
  'fresca',
  'etnici',
] as const

export type Mood = (typeof MOODS)[number] | 'tutti'

export const MOOD_LABELS: Record<Mood, string> = {
  tutti: 'Tutti',
  gourmet: 'Gourmet',
  pasticceria: 'Pasticceria',
  comfort: 'Comfort',
  fresca: 'Fresca',
  etnici: 'Piatti etnici',
}

export const DIFFICOLTA = ['facile', 'media', 'difficile'] as const
export type Difficolta = (typeof DIFFICOLTA)[number]

export const DIFFICOLTA_LABELS: Record<Difficolta, string> = {
  facile: 'Facile',
  media: 'Media',
  difficile: 'Difficile',
}

export const STATO_RICETTA = ['completa', 'da_completare'] as const
export type StatoRicetta = (typeof STATO_RICETTA)[number]

export const STATO_LABELS: Record<StatoRicetta, string> = {
  completa: 'Completa',
  da_completare: 'Da completare',
}

export const COMMON_UNITS = [
  'g', 'kg', 'mg',
  'ml', 'l', 'cl',
  'cucchiaio', 'cucchiai', 'cucchiaini', 'cucchiaino',
  'tazza', 'tazze',
  'pezzo', 'pezzi',
  'spicchio', 'spicchi',
  'foglia', 'foglie',
  'rametto', 'rametti',
  'pizzico', 'q.b.', 'qb',
] as const

export type UnitaMisura = (typeof COMMON_UNITS)[number]

export const COMMON_GROUPS = [
  'impasto',
  'ripieno',
  'decorazione',
  'condimento',
  'salsa',
  'guarnizione',
  'base',
  'copertura',
  'farcia',
  'marinatura',
] as const

export type GruppoIngrediente = (typeof COMMON_GROUPS)[number]

export const DEFAULT_PORZIONI_UNITA = 'porzioni'

// ============================================
// SCHEMA ZOD
// ============================================

// Helper per validazione enum
const enumValidator = <T extends readonly string[]>(values: T, fieldName: string) =>
  z.string().refine(
    (val) => values.includes(val as T[number]),
    { message: `${fieldName} non valido` }
  )

// Ingrediente
export const ingredienteSchema = z.object({
  nome: z.string().min(1, 'Nome ingrediente obbligatorio'),
  quantita: z.union([z.number().min(0), z.string()]).optional().nullable(),
  unita: z.string().optional().nullable(),
  gruppo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export type Ingrediente = z.infer<typeof ingredienteSchema>

// Passaggio - RIMOSSO video_secondi
export const passaggioSchema = z.object({
  titolo: z.string().optional().nullable(),
  testo: z.string().min(1, 'Testo passaggio obbligatorio'),
})

export type Passaggio = z.infer<typeof passaggioSchema>

// Variante - RIMOSSO video_secondi
export const varianteSchema = z.object({
  titolo: z.string().min(1, 'Titolo variante obbligatorio'),
  testo: z.string().min(1, 'Testo variante obbligatorio'),
})

export type Variante = z.infer<typeof varianteSchema>

// Ricetta base (campi comuni) - RIMOSSO fonte_url
const baseRecipeSchema = z.object({
  titolo: z.string().min(1, 'Titolo obbligatorio'),
  autore: z.string().optional().nullable(),
  stato: enumValidator(STATO_RICETTA, 'Stato'),
  categoria: enumValidator(CATEGORIE, 'Categoria').optional().nullable(),
  mood: enumValidator(MOODS, 'Mood').optional().nullable(),
  difficolta: enumValidator(DIFFICOLTA, 'Difficoltà').optional().nullable(),
  tags: z.array(enumValidator(ALL_TAGS, 'Tag')).default([]),
  tempo_minuti: z.number().int().min(1).max(1440).optional().nullable(),
  porzioni: z.number().int().min(1).max(100).optional().nullable(),
  porzioni_unita: z.string().min(1).default(DEFAULT_PORZIONI_UNITA),
  ingredienti: z.array(ingredienteSchema).default([]),
  passaggi: z.array(passaggioSchema).default([]),
  varianti: z.array(varianteSchema).default([]),
  note: z.string().optional().nullable(),
  descrizione: z.string().optional().nullable(),
})

// Ricetta per INSERT (senza id, created_at, updated_at, contatori)
export const recipeInsertSchema = baseRecipeSchema.superRefine((data, ctx) => {
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

export type RecipeInsert = z.infer<typeof recipeInsertSchema>

// Ricetta per UPDATE (tutti i campi opzionali eccetto stato)
export const recipeUpdateSchema = baseRecipeSchema.partial().superRefine((data, ctx) => {
  // Se si sta cambiando lo stato a 'completa', validiamo i campi richiesti
  if (data.stato === 'completa') {
    if (data.categoria === undefined || data.categoria === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Categoria obbligatoria per ricette complete', path: ['categoria'] })
    }
    if (data.mood === undefined || data.mood === null) {
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

export type RecipeUpdate = z.infer<typeof recipeUpdateSchema>

// Ricetta completa dal database (con tutti i campi)
export const recipeSchema = baseRecipeSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  volte_fatta: z.number().int().min(0).default(0),
  ultima_volta: z.string().datetime().optional().nullable(),
})

export type Recipe = z.infer<typeof recipeSchema>

// Tipo per il form (con campi opzionali per default values) - RIMOSSO fonte_url
export const recipeFormSchema = baseRecipeSchema.extend({
  // Override per rendere tutti i campi opzionali nel form (default values)
  ingredienti: z.array(ingredienteSchema).default([]),
  passaggi: z.array(passaggioSchema).default([]),
  varianti: z.array(varianteSchema).default([]),
  tags: z.array(enumValidator(ALL_TAGS, 'Tag')).default([]),
  porzioni_unita: z.string().default(DEFAULT_PORZIONI_UNITA),
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

// Tipo output esplicito per il form (array sempre required) - RIMOSSO fonte_url
export type RecipeFormData = {
  titolo: string
  autore: string | null
  stato: StatoRicetta
  categoria: string | null
  mood: string | null
  difficolta: string | null
  tags: string[]  // Tag[] è troppo restrittivo per l'input form
  tempo_minuti: number | null
  porzioni: number | null
  porzioni_unita: string
  ingredienti: Ingrediente[]
  passaggi: Passaggio[]
  varianti: Variante[]
  note: string | null
  descrizione: string | null
}

// ============================================
// HELPER PER NORMALIZZAZIONE
// ============================================

/**
 * Normalizza un ingrediente dal database al formato form
 */
export function normalizeIngredientFromDb(ing: unknown): Ingrediente {
  const i = ing as Record<string, unknown>
  return {
    nome: String(i.nome ?? ''),
    quantita: (i.quantita as number | string | null) ?? null,
    unita: (i.unita as string | null) ?? null,
    gruppo: (i.gruppo as string | null) ?? null,
    note: (i.note as string | null) ?? null,
  }
}

/**
 * Normalizza un passaggio dal database al formato form - RIMOSSO video_secondi
 */
export function normalizePassaggioFromDb(p: unknown): Passaggio {
  const step = p as Record<string, unknown>
  return {
    titolo: (step.titolo as string | null) ?? null,
    testo: String(step.testo ?? ''),
  }
}

/**
 * Normalizza una variante dal database al formato form - RIMOSSO video_secondi
 */
export function normalizeVarianteFromDb(v: unknown): Variante {
  const variant = v as Record<string, unknown>
  return {
    titolo: String(variant.titolo ?? ''),
    testo: String(variant.testo ?? ''),
  }
}

/**
 * Normalizza una ricetta dal database al formato form - RIMOSSO fonte_url
 */
export function normalizeRecipeFromDb(data: unknown): RecipeFormData {
  const r = data as Record<string, unknown>
  return {
    titolo: String(r.titolo ?? ''),
    autore: (r.autore as string | null) ?? null,
    stato: (r.stato as StatoRicetta) ?? 'completa',
    categoria: (r.categoria as string | null) ?? null,
    mood: (r.mood as string | null) ?? null,
    difficolta: (r.difficolta as string | null) ?? null,
    tags: (r.tags as string[]) ?? [],
    tempo_minuti: (r.tempo_minuti as number | null) ?? null,
    porzioni: (r.porzioni as number | null) ?? null,
    porzioni_unita: String(r.porzioni_unita ?? DEFAULT_PORZIONI_UNITA),
    ingredienti: ((r.ingredienti as unknown[]) ?? []).map(normalizeIngredientFromDb),
    passaggi: ((r.passaggi as unknown[]) ?? []).map(normalizePassaggioFromDb),
    varianti: ((r.varianti as unknown[]) ?? []).map(normalizeVarianteFromDb),
    note: (r.note as string | null) ?? null,
    descrizione: (r.descrizione as string | null) ?? null,
  }
}

/**
 * Prepara una ricetta per il salvataggio nel database - RIMOSSO video_secondi
 */
export function prepareRecipeForDb(data: RecipeFormData): RecipeInsert {
  // Helper: converte 0, NaN, stringa vuota in null per campi numerici opzionali
  const normalizeNumber = (val: number | string | null | undefined): number | null => {
    if (val == null) return null
    if (typeof val === 'number' && (isNaN(val) || val === 0)) return null
    if (typeof val === 'string' && val.trim() === '') return null
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? null : num
  }

  return {
    ...data,
    tempo_minuti: normalizeNumber(data.tempo_minuti),
    porzioni: normalizeNumber(data.porzioni),
    ingredienti: data.ingredienti.map(ing => ({
      ...ing,
      nome: ing.nome.toLowerCase().trim(),
      quantita: typeof ing.quantita === 'string' && ing.quantita.trim() === '' ? null : ing.quantita,
      unita: ing.unita?.trim() || null,
      gruppo: ing.gruppo?.trim() || null,
      note: ing.note?.trim() || null,
    })),
    passaggi: data.passaggi.map(p => ({
      titolo: p.titolo?.trim() || null,
      testo: p.testo.trim(),
    })),
    varianti: data.varianti.map(v => ({
      titolo: v.titolo.trim(),
      testo: v.testo.trim(),
    })),
    tags: data.tags,
  }
}