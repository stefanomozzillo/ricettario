/**
 * Avviso "Nuova versione disponibile" quando il service worker è in attesa.
 * Non ricarica mai la pagina da solo: l'utente clicca "Aggiorna".
 * Stile con token del tema, role="status", sopra la bottom nav senza coprirla.
 */

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

    let reg: ServiceWorkerRegistration | undefined

    const checkWaiting = async () => {
      reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) setWaiting(reg.waiting)
    }

    checkWaiting()

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Attivato dopo il clic su "Aggiorna": ora il reload è voluto dall'utente
      window.location.reload()
    })

    navigator.serviceWorker.ready.then((r) => {
      r.addEventListener('updatefound', () => {
        const sw = r.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(sw)
          }
        })
      })
      if (r.waiting) setWaiting(r.waiting)
    })

    return () => { reg = undefined }
  }, [])

  if (!waiting || dismissed) return null

  const handleUpdate = () => {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <div
      role="status"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 max-w-[720px] mx-auto z-50 animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--card-bordo)] rounded-2xl shadow-[var(--elevazione-3)] px-4 py-3">
        <RefreshCw size={20} className="text-[var(--accento)] flex-shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm font-medium text-[var(--testo)] min-w-0">
          Nuova versione disponibile
        </p>
        <button
          type="button"
          onClick={handleUpdate}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--accento)] text-[var(--accento-testo)] text-sm font-semibold min-h-[44px] touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2 active:scale-[0.97] transition-transform"
        >
          Aggiorna
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Chiudi avviso"
          className="flex-shrink-0 p-2 rounded-lg text-[var(--secondario)] hover:text-[var(--testo)] hover:bg-[var(--card-bordo)] min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus-visible:outline-2 focus-visible:outline-[var(--accento)]"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
