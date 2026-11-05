/**
 * Pulsante "Torna in cima": FAB circolare centrato in basso, visibile dopo scroll > 200px.
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
        'fixed bottom-6 left-1/2 z-50',
        'flex items-center justify-center w-11 h-11 rounded-full',
        'bg-gray-900 text-white shadow-lg',
        'hover:bg-gray-700 active:scale-[0.95]',
        'transition-[transform,background-color] duration-200 ease-out',
        'focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2',
        'animate-in fade-in zoom-in-95 duration-200'
      )}
      style={{ transform: 'translateX(-50%)' }}
    >
      <ChevronUp size={20} strokeWidth={2.5} aria-hidden="true" />
    </button>
  )
}
