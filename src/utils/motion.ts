/**
 * Rilevamento "riduci animazioni": legge la classe `reduce-motion` su
 * document.documentElement (impostata da Impostazioni, persistita in localStorage)
 * oppure la media query di sistema. Reattivo ai cambi della classe.
 */

import { useEffect, useState } from 'react'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (document.documentElement.classList.contains('reduce-motion')) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion())

  useEffect(() => {
    const update = () => setReduced(prefersReducedMotion())
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', update)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
    }
  }, [])

  return reduced
}
