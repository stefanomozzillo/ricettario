/**
 * Cronologia preparazioni - storage locale (localStorage)
 * Ogni record: id, ricetta_id, titolo, data ISO, mood, categoria
 */

export interface HistoryEntry {
  id: string
  ricetta_id: string
  titolo: string
  data: string // ISO 8601
  mood: string | null
  categoria: string | null
}

const STORAGE_KEY = 'ricettario-history'
const MAX_ENTRIES = 200

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.error('Errore salvataggio cronologia:', err)
  }
}

/** Aggiunge una voce di cronologia (più recente in cima). Ritorna la entry creata. */
export function addHistoryEntry(input: Omit<HistoryEntry, 'id' | 'data'>): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: new Date().toISOString(),
    ...input,
  }
  const entries = [entry, ...readAll()].slice(0, MAX_ENTRIES)
  writeAll(entries)
  return entry
}

/** Restituisce tutte le voci, dalla più recente alla meno recente. */
export function getHistory(): HistoryEntry[] {
  return readAll().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

/** Elimina una voce per id. */
export function removeHistoryEntry(id: string) {
  writeAll(readAll().filter(e => e.id !== id))
}

/** Svuota tutta la cronologia. */
export function clearHistory() {
  writeAll([])
}

/**
 * Formatta la data in modo relativo e leggibile:
 * "Oggi, 14:30" | "Ieri, 09:15" | "24 ottobre 2026"
 */
export function formatHistoryDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000)

  if (diffDays === 0) return `Oggi, ${time}`
  if (diffDays === 1) return `Ieri, ${time}`
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}
