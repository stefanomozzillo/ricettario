/* Ricettario service worker - PWA
 * - Precache solo app shell (html, manifest, icone)
 * - Runtime cache per /assets/* (file hashati, immutable)
 * - Navigazioni: network-first con fallback a index.html
 * - MAI cache per Supabase (rest/auth/storage/functions) né signed URL
 * - Nuova versione: avvisa i client, non ricarica mai da solo
 */

const VERSION = 'v1'
const CACHE_STATIC = `ricettario-static-${VERSION}`
const CACHE_ASSETS = `ricettario-assets-${VERSION}`

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon-opaque.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/icons/maskable-512.png',
]

function isSupabase(url) {
  return url.hostname.includes('supabase')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      // NIENTE skipWaiting qui: la nuova versione resta in attesa
      // finché l'utente non clicca "Aggiorna" (mai ricaricare da soli)
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('ricettario-') && k !== CACHE_STATIC && k !== CACHE_ASSETS)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Avvisa i client che c'è una nuova versione (no auto-reload)
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: VERSION }))
        })
      })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Mai intercettare Supabase né richieste non-GET
  if (event.request.method !== 'GET' || isSupabase(url) || url.origin !== self.location.origin) {
    return
  }

  // Asset hashati: cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((resp) => {
            if (resp.ok) cache.put(event.request, resp.clone())
            return resp
          })
        })
      )
    )
    return
  }

  // Navigazioni: network-first, fallback a index.html (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE_STATIC).then((cache) => cache.put('/index.html', copy))
          return resp
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Altre richieste same-origin (icone, manifest): network-first con fallback cache
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) {
          const copy = resp.clone()
          caches.open(CACHE_STATIC).then((cache) => cache.put(event.request, copy))
        }
        return resp
      })
      .catch(() => caches.match(event.request))
  )
})
