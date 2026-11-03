/**
 * Pulsante "Torna in cima": FAB circolare in basso a destra (sopra la bottom nav),
 * visibile solo dopo aver scrollato oltre SHOW_AFTER_PX. Click = scroll fluido in cima.
 */

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'

const SHOW_AFTER_PX = 200

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Torna in cima"
      className={clsx(
        'fixed right-4 z-40 w-12 h-12 rounded-full',
        'bg-[var(--card)] text-[var(--testo)] border border-[var(--card-bordo)]',
        'shadow-[var(--elevazione-2)]',
        'flex items-center justify-center touch-manipulation',
        'hover:bg-[var(--card-bordo)] active:scale-[0.95]',
        'transition-[transform,background-color] duration-200 ease-out',
        'focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2',
        'animate-in fade-in zoom-in-95 duration-200'
      )}
      style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <ChevronUp size={24} aria-hidden="true" />
    </button>
  )
}
