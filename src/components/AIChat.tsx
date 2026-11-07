/**
 * Componente Chat AI per il dettaglio ricetta
 * Permette conversazione contestuale sulla ricetta
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { aiChat, useAiAvailable } from '../lib/ai'
import { type RecipeFormData } from '../lib/types'
import { Button } from './Button'

interface AIChatProps {
  recipe: Partial<RecipeFormData> & { id: string }
}

export function AIChat({ recipe }: AIChatProps) {
  const { user } = useAuth()
  const { available: aiAvailable, reason: aiUnavailableReason, check: checkAi } = useAiAvailable()
  const [messages, setMessages] = useState<Array<{ ruolo: 'utente' | 'assistente'; testo: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isFirstMount = useRef(true)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Verifica disponibilità AI al mount
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      checkAi()
    }
  }, [checkAi])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !aiAvailable) return

    const userMessage = input.trim()
    setInput('')
    setError(null)
    setLoading(true)

    // Aggiunge messaggio utente subito per UX immediata
    setMessages(prev => [...prev, { ruolo: 'utente', testo: userMessage }])

    try {
      const { risposta } = await aiChat(
        recipe,
        [...messages, { ruolo: 'utente' as const, testo: userMessage }].slice(-6)
      )
      setMessages(prev => [...prev, { ruolo: 'assistente', testo: risposta }])
    } catch (e: any) {
      setError(e?.message ?? 'Errore durante la chat.')
      // Rimuove l'ultimo messaggio utente se c'è errore
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [input, loading, aiAvailable, messages, recipe, checkAi])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!user) {
    return (
      <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
        <div className="flex items-center gap-3 text-[var(--secondario)]">
          <Sparkles size={20} className="flex-shrink-0 text-[var(--accento)]" />
          <span className="text-sm">Effettua il login per usare la chat AI.</span>
        </div>
      </section>
    )
  }

  if (!aiAvailable) {
    return (
      <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
        <div className="flex items-center gap-3 text-[var(--secondario)]">
          <Sparkles size={20} className="flex-shrink-0 text-[var(--accento)]" />
          <span className="text-sm">
            Assistente AI non disponibile: {(() => {
              switch (aiUnavailableReason) {
                case 'unauthorized': return 'Effettua il login.'
                case 'rate_limited': return 'Limite giornaliero raggiunto.'
                case 'service_unavailable': return 'Servizio temporaneamente non disponibile.'
                case 'offline': return 'Sei offline.'
                default: return 'Riprova più tardi.'
              }
            })()}
            <Button variant="ghost" size="sm" className="ml-2" onClick={checkAi}>
              Riprova
            </Button>
          </span>
        </div>
      </section>
    )
  }

  return (
    <section className="card bg-[var(--card)] rounded-2xl border border-[var(--bordo)] p-4 mb-4">
      <h2 className="text-lg font-semibold text-[var(--testo)] flex items-center gap-2 mb-3">
        <Sparkles size={20} className="text-[var(--accento)]" />
        Assistente AI
      </h2>
      <p className="text-sm text-[var(--secondario)] mb-3">
        Chiedi informazioni sulla ricetta, sostituzioni, varianti o consigli di cottura.
      </p>

      {/* Messaggi */}
      <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="text-center text-[var(--secondario)] py-6">
            <Sparkles size={32} className="mx-auto mb-2 text-[var(--accento)]/50" />
            <p className="text-sm">Inizia la conversazione...</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx(
              'flex gap-2 animate-fade-in',
              msg.ruolo === 'utente' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                msg.ruolo === 'utente'
                  ? 'bg-[var(--accento)] text-white'
                  : 'bg-[var(--sfondo)] text-[var(--accento)] border border-[var(--bordo)]'
              )}
              aria-hidden="true"
            >
              {msg.ruolo === 'utente' ? '👤' : '🤖'}
            </div>
            <div
              className={clsx(
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                msg.ruolo === 'utente'
                  ? 'bg-[var(--accento)] text-white rounded-tr-xs'
                  : 'bg-[var(--sfondo)] text-[var(--testo)] rounded-tl-xs border border-[var(--bordo)]'
              )}
            >
              {msg.testo}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mb-3 p-2 bg-[var(--accento)]/10 border border-[var(--accento)]/30 rounded-xl text-sm text-[var(--accento)]" role="alert">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Attendi risposta...' : 'Scrivi un messaggio... (Shift+Enter per nuova riga)'}
          rows={1}
          disabled={loading}
          className={clsx(
            'flex-1 px-4 py-2 rounded-xl border bg-[var(--sfondo)] text-[var(--testo)] placeholder-[var(--secondario)] focus:outline-none focus:ring-2 focus:ring-[var(--accento)] focus:border-transparent transition-all duration-150 resize-none',
            loading && 'opacity-50 cursor-wait'
          )}
          style={{ minHeight: '44px' }}
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          isLoading={loading}
          className="flex-shrink-0 touch-manipulation min-h-[44px]"
          aria-label="Invia messaggio"
        >
          <Send size={20} />
        </Button>
      </div>
    </section>
  )
}