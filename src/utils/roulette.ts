/**
 * Logica pura della Roulette - nessuna dipendenza da React.
 * Pool, filtri, vincitore e striscia animata (slot machine).
 */

import { ROULETTE_EXCLUDE_DAYS } from '../lib/config'

export interface RouletteRecipe {
  id: string
  titolo: string
  stato: 'completa' | 'da_completare'
  categoria: string | null
  mood: string | null
  tempo_minuti: number | null
  porzioni: number | null
  porzioni_unita: string | null
  autore: string | null
  ultima_volta: string | null
}

export interface RouletteFilters {
  categoria: string // '' = tutte
  tempoMax: number | null
  escludiRecenti: boolean
}

export const DEFAULT_ROULETTE_FILTERS: RouletteFilters = {
  categoria: '',
  tempoMax: null,
  escludiRecenti: false,
}

const DAY_MS = 86400000

function passaTempo(r: RouletteRecipe, tempoMax: number | null): boolean {
  // Con filtro tempo attivo, null/0 NON passano
  if (tempoMax == null) return true
  return r.tempo_minuti != null && r.tempo_minuti > 0 && r.tempo_minuti <= tempoMax
}

function passaRecenti(r: RouletteRecipe, escludiRecenti: boolean, now: Date): boolean {
  // ultima_volta null = mai fatta = ammessa
  if (!escludiRecenti || !r.ultima_volta) return true
  const since = now.getTime() - ROULETTE_EXCLUDE_DAYS * DAY_MS
  return new Date(r.ultima_volta).getTime() < since
}

/**
 * Pool candidati: TUTTE le ricette (anche "da completare"), rispetta il mood.
 */
export function buildPool(
  recipes: RouletteRecipe[],
  filters: RouletteFilters,
  mood: string,
  now: Date = new Date()
): RouletteRecipe[] {
  return recipes.filter(r => {
    if (mood !== 'tutti' && r.mood !== mood) return false
    if (filters.categoria && r.categoria !== filters.categoria) return false
    if (!passaTempo(r, filters.tempoMax)) return false
    if (!passaRecenti(r, filters.escludiRecenti, now)) return false
    return true
  })
}

export type EmptyPoolReason = 'mood' | 'categoria' | 'tempo' | 'recenti' | null

/**
 * Dice quale filtro svuota il pool (applicati in ordine cumulativo),
 * per mostrare un messaggio utile. null = pool non vuoto.
 */
export function emptyPoolReason(
  recipes: RouletteRecipe[],
  filters: RouletteFilters,
  mood: string,
  now: Date = new Date()
): EmptyPoolReason {
  let cur = recipes
  if (mood !== 'tutti') {
    cur = cur.filter(r => r.mood === mood)
    if (cur.length === 0) return 'mood'
  }
  if (filters.categoria) {
    cur = cur.filter(r => r.categoria === filters.categoria)
    if (cur.length === 0) return 'categoria'
  }
  if (filters.tempoMax != null) {
    cur = cur.filter(r => passaTempo(r, filters.tempoMax))
    if (cur.length === 0) return 'tempo'
  }
  if (filters.escludiRecenti) {
    cur = cur.filter(r => passaRecenti(r, true, now))
    if (cur.length === 0) return 'recenti'
  }
  return null
}

/** Fisher-Yates shuffle (copia). */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Sceglie il vincitore. Se il pool ha più di una ricetta, evita di
 * restituire subito la stessa dell'ultimo giro.
 */
export function pickWinner(pool: RouletteRecipe[], previousId?: string | null, rng: () => number = Math.random): RouletteRecipe {
  if (pool.length === 0) throw new Error('Pool vuoto')
  if (pool.length === 1) return pool[0]
  let idx = Math.floor(rng() * pool.length)
  if (previousId && pool[idx].id === previousId) {
    idx = (idx + 1) % pool.length
  }
  return pool[idx]
}

/**
 * Costruisce la striscia verticale di titoli per l'animazione:
 * titoli del pool mescolati (ripetuti se il pool è piccolo) + vincitore in fondo.
 * Ritorna i titoli; il vincitore è sempre all'ultimo indice.
 */
export function buildStrip(pool: RouletteRecipe[], winner: RouletteRecipe, minLength = 25, rng: () => number = Math.random): string[] {
  const titles: string[] = []
  while (titles.length < minLength) {
    for (const r of shuffle(pool, rng)) {
      titles.push(r.titolo)
      if (titles.length >= minLength) break
    }
  }
  titles.push(winner.titolo)
  return titles
}
