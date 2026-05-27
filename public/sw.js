const CACHE_NAME = 'vocab-bloom-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg'
];

// Install Event - Pre-caches critical page shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Evicts old caches on update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // We only intercept GET requests
  if (request.method !== 'GET') return;

  // Only handle http/https requests (ignores ws/wss, chrome-extension, data URIs, etc. to prevent WebSocket drops/Vite HMR loops)
  if (!url.protocol.startsWith('http')) return;

  // Only intercept requests for our own origin or pre-connected Google Fonts (prevents YouTube/YouGlish caching and CORS lockups)
  const isSelfOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com');
  if (!isSelfOrigin && !isGoogleFont) return;

  // Check if it's a static asset
  const isStaticAsset = 
    url.pathname.includes('/assets/') || 
    url.hostname.includes('fonts.gstatic.com') || 
    url.hostname.includes('fonts.googleapis.com') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js');

  if (isStaticAsset) {
    // Cache-First strategy for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } else {
    // Stale-While-Revalidate for document/API requests
    // Delivers instantaneous loads from cache, while silently updating files in the background.
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Graceful fallback for completely offline navigation requests
          if (request.mode === 'navigate') {
            return caches.match('./');
          }
        });

        return cachedResponse || networkFetch;
      })
    );
  }
});
