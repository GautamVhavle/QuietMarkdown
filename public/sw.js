/*
 * QuietMarkdown offline service worker.
 *
 * Strategy:
 *  - App shell (navigation requests): network first, fall back to the cached
 *    shell so the editor opens without a connection. A fresh response
 *    refreshes the cache in the background.
 *  - Same-origin static assets: stale-while-revalidate. Hashed Vite bundles
 *    are immutable, so serving the cached copy instantly is always correct.
 *  - Everything else (cross-origin, non-GET): pass through untouched.
 *
 * The worker never touches document content — drafts live in localStorage,
 * which is outside its scope entirely.
 */

const CACHE_NAME = 'quietmarkdown-v1'
const APP_SHELL = ['/', '/index.html', '/site.webmanifest', '/favicon.ico', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    }),
  )
})
