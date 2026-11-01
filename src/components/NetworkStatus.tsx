/**
 * Network Status Banner - rileva stato online/offline
 */

import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, AlertCircle, X } from 'lucide-react'
import { clsx } from 'clsx'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    if (wasOffline) {
      setWasOffline(false)
      // Mostra brevemente il banner di "tornato online"
      setDismissed(false)
      setTimeout(() => setDismissed(true), 3000)
    }
  }, [wasOffline])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
    setDismissed(false)
  }, [])

  useEffect(() => {
    // Stato iniziale
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Non mostrare nulla se online e mai stato offline, o se dismissed
  if (isOnline && !wasOffline) return null
  if (dismissed && isOnline) return null

  return (
    <div
      className={clsx('network-banner', !isOnline && 'offline', isOnline && 'online-restored')}
      role="alert"
      aria-live="polite"
    >
      <div className="banner-content">
        <span className="banner-icon">
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
        </span>
        <span className="banner-text">
          {isOnline ? 'Connessione ripristinata' : 'Sei offline. Le modifiche saranno sincronizzate al ritorno online.'}
        </span>
      </div>
      {!isOnline && (
        <button
          className="banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Nascondi"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/**
 * Hook per verificare se siamo online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Componente per mostrare stato sync nei bottoni/actions
 */
export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus()
  const [pendingChanges, setPendingChanges] = useState(0)

  // In un'app reale, qui controlleresti se ci sono modifiche in coda
  // per ora simuliamo con localStorage
  useEffect(() => {
    const checkPending = () => {
      try {
        const pending = localStorage.getItem('ricettario-pending-changes')
        setPendingChanges(pending ? JSON.parse(pending).length : 0)
      } catch {
        setPendingChanges(0)
      }
    }
    checkPending()
    const interval = setInterval(checkPending, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!isOnline && pendingChanges > 0) {
    return (
      <div className="sync-indicator pending" title={`${pendingChanges} modifiche in coda`}>
        <AlertCircle size={16} />
        <span>{pendingChanges}</span>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="sync-indicator offline" title="Offline">
        <WifiOff size={16} />
      </div>
    )
  }

  return (
    <div className="sync-indicator online" title="Online">
      <Wifi size={16} />
    </div>
  )
}