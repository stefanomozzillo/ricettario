/**
 * Client AI per chiamare la Edge Function `ai-assistant` via supabase.functions.invoke.
 * Timeout 30 s, mappatura errori in italiano, hook useAiAvailable.
 */

import { supabase } from './supabase'
import type { RecipeFormData, Ingrediente } from './types'

// ============================================
// TIPI
// ============================================
export type AiAction = 'import' | 'fill' | 'chat' | 'substitutions'

export interface AiImportRequest {
  action: 'import'
  testo: string
}

export interface AiFillRequest {
  action: 'fill'
  descrizione: string
  ricetta: Partial<RecipeFormData>
}

export interface AiChatRequest {
  action: 'chat'
  ricetta: Partial<RecipeFormData>
  messaggi: Array<{ ruolo: 'utente' | 'assistente'; testo: string }>
}

export interface AiSubstitutionsRequest {
  action: 'substitutions'
  titolo: string
  ingredienti: Array<{ nome: string }>
  mancanti: string[]
}

export type AiRequest = AiImportRequest | AiFillRequest | AiChatRequest | AiSubstitutionsRequest

export interface AiImportResponse {
  ricetta: Partial<RecipeFormData>
}
export interface AiFillResponse {
  ricetta: Partial<RecipeFormData>
}
export interface AiChatResponse {
  risposta: string
}
export interface AiSubstitutionsResponse {
  sostituzioni: Array<{ ingrediente_mancante: string; sostituzioni: Array<{ nome: string; nota: string }> }>
}

export type AiResponse = AiImportResponse | AiFillResponse | AiChatResponse | AiSubstitutionsResponse

export interface AiError {
  errore: string
  status?: number
}

// ============================================
// COSTANTI
// ============================================
const FUNCTION_NAME = 'ai-assistant'
const DEFAULT_TIMEOUT_MS = 30000
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Richiesta non valida.',
  401: 'Sessione scaduta. Effettua di nuovo il login.',
  403: 'Non sei autorizzato a usare l\'assistente AI.',
  429: 'Limite giornaliero raggiunto. Riprova domani.',
  502: 'Risposta dell\'AI non valida. Riprova.',
  503: 'Servizio AI temporaneamente non disponibile.',
  504: 'Timeout: l\'AI ha impiegato troppo tempo a rispondere.',
  0: 'Errore di rete. Controlla la connessione.',
}

// ============================================
// FUNZIONE PRINCIPALE: invokeAi
// ============================================
export async function invokeAi<T extends AiResponse>(request: AiRequest, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Verifica sessione prima di chiamare (evita errori 401 silenziosi)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw { status: 401, message: ERROR_MESSAGES[401] }
    }

    const { data, error } = await supabase.functions.invoke<T>(FUNCTION_NAME, {
      body: request,
      headers: {
        // Il token JWT viene aggiunto automaticamente dal client supabase se c'è una sessione attiva
      },
    })

    if (error) {
      // error può essere un oggetto con status/message
      // In caso di CORS bloccato, error potrebbe non avere status → logghiamo per debug
      const status = (error as any).status ?? (error as any).response?.status ?? 0
      const message = ERROR_MESSAGES[status] ?? (error as any).message ?? 'Errore sconosciuto.'
      // Log per debug: se status === 0, probabile CORS o rete
      if (status === 0) {
        console.error('[invokeAi] Network/CORS error:', { error, request: { action: request.action } })
      }
      throw { status, message, original: error }
    }

    return data as T
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.code === 'ECONNABORTED') {
      throw { status: 504, message: ERROR_MESSAGES[504] }
    }
    if (e?.status && e?.message) throw e
    // Errore generico di rete
    throw { status: 0, message: ERROR_MESSAGES[0] }
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================
// HELPER SPECIFICI PER AZIONE
// ============================================
export async function aiImport(testo: string): Promise<AiImportResponse> {
  if (!testo.trim()) throw { status: 400, message: 'Testo vuoto.' }
  return invokeAi<AiImportResponse>({ action: 'import', testo: testo.trim() })
}

export async function aiFill(descrizione: string, ricetta: Partial<RecipeFormData>): Promise<AiFillResponse> {
  if (!descrizione.trim()) throw { status: 400, message: 'Descrizione vuota.' }
  return invokeAi<AiFillResponse>({ action: 'fill', descrizione: descrizione.trim(), ricetta })
}

export async function aiChat(
  ricetta: Partial<RecipeFormData>,
  messaggi: Array<{ ruolo: 'utente' | 'assistente'; testo: string }>
): Promise<AiChatResponse> {
  if (!messaggi.length) throw { status: 400, message: 'Nessun messaggio.' }
  return invokeAi<AiChatResponse>({ action: 'chat', ricetta, messaggi: messaggi.slice(-6) })
}

export async function aiSubstitutions(
  titolo: string,
  ingredienti: Array<{ nome: string }>,
  mancanti: string[]
): Promise<AiSubstitutionsResponse> {
  if (!titolo.trim() || !mancanti.length) throw { status: 400, message: 'Parametri mancanti.' }
  return invokeAi<AiSubstitutionsResponse>({ action: 'substitutions', titolo: titolo.trim(), ingredienti, mancanti })
}

// ============================================
// HOOK: useAiAvailable
// ============================================
import { useState, useEffect, useCallback } from 'react'

export interface AiAvailabilityState {
  available: boolean
  reason: 'unauthorized' | 'rate_limited' | 'service_unavailable' | 'offline' | null
  check: () => Promise<void>
}

export function useAiAvailable(): AiAvailabilityState {
  const [available, setAvailable] = useState(true)
  const [reason, setReason] = useState<AiAvailabilityState['reason']>(null)

  const check = useCallback(async () => {
    try {
      // Controllo leggero: sessione attiva + connessione di rete
      // NON chiamiamo la Edge Function per evitare falsi positivi/negativi
      // (il health check fake causava errori 400 mal gestiti → "offline")
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setAvailable(false)
        setReason('unauthorized')
        return
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setAvailable(false)
        setReason('offline')
        return
      }
      // Se abbiamo sessione e siamo online, consideriamo l'AI disponibile.
      // Le chiamate reali (import, fill, chat, substitutions) gestiranno
      // i propri errori (429, 503, 504) e aggiorneranno lo stato se serve.
      setAvailable(true)
      setReason(null)
    } catch {
      setAvailable(false)
      setReason('offline')
    }
  }, [])

  useEffect(() => {
    check()
    // Controlla periodicamente (es. ogni 5 min)
    const interval = setInterval(check, 5 * 60 * 1000)
    // Ascolta anche cambiamenti di online/offline
    const handleOnline = () => check()
    const handleOffline = () => { setAvailable(false); setReason('offline'); }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [check])

  return { available, reason, check }
}

// ============================================
// MESSAGGI LOCALIZZATI PER STATO DISPONIBILITÀ
// ============================================
export function getAiUnavailableMessage(reason: AiAvailabilityState['reason']): string {
  switch (reason) {
    case 'unauthorized':
      return 'Effettua il login per usare l\'assistente AI.'
    case 'rate_limited':
      return 'Hai raggiunto il limite giornaliero di richieste AI. Riprova domani.'
    case 'service_unavailable':
      return 'Il servizio AI è temporaneamente non disponibile.'
    case 'offline':
      return 'Sei offline o il servizio non è raggiungibile.'
    default:
      return 'Assistente AI non disponibile.'
  }
}

// ============================================
// UTILITY: confronta ingredienti importati con esistenti per evitare duplicati
// ============================================
import { normalizeIngredientName } from '../utils/pantry'

/**
 * Confronta due array di ingredienti (da AI e dal form) e restituisce quelli nuovi
 * che non sono "simili" a quelli già presenti.
 * Similitudine = stesso nome normalizzato.
 */
export function filterNewIngredients(
  aiIngredients: Array<{ nome: string }>,
  existingIngredients: Ingrediente[]
): Array<{ nome: string }> {
  const existingNames = new Set(existingIngredients.map(ing => normalizeIngredientName(ing.nome)))
  return aiIngredients.filter(aiIng => {
    const norm = normalizeIngredientName(aiIng.nome)
    return norm && !existingNames.has(norm)
  })
}