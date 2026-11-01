/**
 * MoodContext - Gestione selezione mood con persistenza localStorage
 * Applica data-mood su document.documentElement per attivare palette CSS
 */

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { MOOD_OPTIONS, type Mood } from '../lib/config'

interface MoodContextType {
  mood: Mood
  setMood: (mood: Mood) => void
  moodOptions: Mood[]
  moodLabels: Record<Mood, string>
}

const MoodContext = createContext<MoodContextType | null>(null)
const MOOD_STORAGE_KEY = 'ricettario-mood'

export function MoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<Mood>('tutti')
  const [mounted, setMounted] = useState(false)

  // Legge da localStorage al mount (client-side only)
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(MOOD_STORAGE_KEY)
      if (stored && MOOD_OPTIONS.includes(stored as Mood)) {
        setMoodState(stored as Mood)
      }
    } catch {
      // localStorage non disponibile (es. Safari private mode)
    }
  }, [])

  // Applica data-mood su :root quando mood cambia
  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-mood', mood)
  }, [mood, mounted])

  const setMood = useCallback((newMood: Mood) => {
    setMoodState(newMood)
    try {
      localStorage.setItem(MOOD_STORAGE_KEY, newMood)
    } catch {
      // Ignora errori localStorage
    }
  }, [])

  // Labels per il selettore (importate da config per evitare duplicazione)
  const moodLabels: Record<Mood, string> = {
    tutti: 'Tutti',
    gourmet: 'Gourmet',
    pasticceria: 'Pasticceria',
    comfort: 'Comfort',
    fresca: 'Fresca',
    etnici: 'Piatti etnici',
  }

  return (
    <MoodContext.Provider value={{ mood, setMood, moodOptions: MOOD_OPTIONS, moodLabels }}>
      {children}
    </MoodContext.Provider>
  )
}

export function useMood() {
  const context = useContext(MoodContext)
  if (!context) {
    throw new Error('useMood deve essere usato dentro MoodProvider')
  }
  return context
}