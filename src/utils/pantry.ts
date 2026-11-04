/**
 * Logica pura di "Cosa ho in casa" - nessuna dipendenza da React.
 * Normalizzazione condivisa, raccolta ingredienti dal DB, calcolo match.
 */

/** Normalizza un nome ingrediente: minuscolo, trim, spazi singoli. */
export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

interface RecipeLike {
  titolo?: unknown
  stato?: unknown
  mood?: unknown
  ingredienti?: unknown
}

/** Nomi unici normalizzati di TUTTI gli ingredienti presenti nelle ricette (per autocomplete). */
export function collectAllIngredients(recipes: RecipeLike[]): string[] {
  const set = new Set<string>()
  for (const r of recipes) {
    const list = (r.ingredienti as Array<{ nome?: unknown }> | null) ?? []
    for (const ing of list) {
      if (ing && typeof ing.nome === 'string' && ing.nome.trim()) {
        set.add(normalizeIngredientName(ing.nome))
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'it'))
}

/** Nomi unici normalizzati di una singola ricetta (un ingrediente ripetuto conta 1). */
export function recipeIngredientNames(recipe: RecipeLike): string[] {
  const list = (recipe.ingredienti as Array<{ nome?: unknown }> | null) ?? []
  const set = new Set<string>()
  for (const ing of list) {
    if (ing && typeof ing.nome === 'string' && ing.nome.trim()) {
      set.add(normalizeIngredientName(ing.nome))
    }
  }
  return [...set]
}

export interface PantryMatch<T> {
  recipe: T
  missing: string[]
  total: number
  matchPct: number
}

export interface PantryResult<T> {
  ready: PantryMatch<T>[]
  almost: PantryMatch<T>[]
}

/**
 * Calcola le corrispondenze. Solo ricette 'completa', rispetta il mood.
 * Le basi da ignorare non contano né come mancanti né nel totale.
 * Una ricetta senza ingredienti validi (dopo aver tolto le basi) non va mai in "Pronte ora".
 * Ordinamento: per numero di mancanti, poi per percentuale di match (discendente).
 */
export function computeMatches<T extends RecipeLike>(
  recipes: T[],
  have: string[],
  ignored: string[],
  mood: string
): PantryResult<T> {
  const haveSet = new Set(have.map(normalizeIngredientName))
  const ignoredSet = new Set(ignored.map(normalizeIngredientName))

  const ready: PantryMatch<T>[] = []
  const almost: PantryMatch<T>[] = []

  for (const recipe of recipes) {
    if (recipe.stato !== 'completa') continue
    if (mood !== 'tutti' && recipe.mood !== mood) continue

    const valid = recipeIngredientNames(recipe).filter(n => !ignoredSet.has(n))
    if (valid.length === 0) continue

    const missing = valid.filter(n => !haveSet.has(n))
    const matchPct = (valid.length - missing.length) / valid.length
    const match: PantryMatch<T> = { recipe, missing, total: valid.length, matchPct }

    if (missing.length === 0) ready.push(match)
    else if (missing.length <= 2) almost.push(match)
  }

  const byMissingThenPct = (a: PantryMatch<T>, b: PantryMatch<T>) =>
    a.missing.length - b.missing.length || b.matchPct - a.matchPct

  return { ready: ready.sort(byMissingThenPct), almost: almost.sort(byMissingThenPct) }
}
