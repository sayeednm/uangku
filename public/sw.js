// Uangku Service Worker v2
const CACHE_NAME = 'uangku-v2'
const OFFLINE_PAGE = '/offline'

const STATIC_ASSETS = [
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin
  if (url.origin !== self.location.origin) return

  // Static assets — cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    STATIC_ASSETS.some(a => url.pathname === a)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Navigation requests — network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Cache successful navigation responses
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return res
        })
        .catch(() =>
          // Try cache, then offline page
          caches.match(request).then(cached =>
            cached ?? caches.match('/') ?? Response.error()
          )
        )
    )
    return
  }
})

// Background sync — retry failed requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    // Future: retry failed transaction saves
  }
})
