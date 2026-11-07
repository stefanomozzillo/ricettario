/**
 * Suggerimento di installazione su iPhone: solo Safari iOS, solo se l'app
 * non è già in standalone, mostrato una sola volta (localStorage in try/catch).
 * Mai su Android né desktop.
 */

import { useEffect, useState } from 'react'
import { Share, X } from 'lucide-react'

const DISMISS_KEY = 'ricettario-ios-hint-dismissed'

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  if (!isIos) return false
  // Solo Safari: escludi Chrome/Firefox/Edge su iOS (CriOS/FxiOS/EdgiOS)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // storage non disponibile: mostra lo stesso, non bloccare l'app
    }
    setVisible(true)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignora: l'app funziona anche senza storage
    }
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 max-w-[720px] mx-auto z-50 animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--card-bordo)] rounded-2xl shadow-[var(--elevazione-3)] px-4 py-3">
        <Share size={20} className="text-[var(--accento)] flex-shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm text-[var(--testo)] min-w-0">
          Per installarla: <strong>Condividi</strong>, poi <strong>Aggiungi alla schermata Home</strong>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Chiudi suggerimento"
          className="flex-shrink-0 p-2 rounded-lg text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--card-bordo)] min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)]"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
