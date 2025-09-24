// service-worker.js
const CACHE_NAME = 'wealth-cmd-v1';
const ASSETS = [
  '/',                  // makes index.html available at '/'
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
  // add any local CSS you committed, e.g. '/css/tailwind.min.css'
];

// 1. Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Fetch: serve from cache, then network, fallback to index.html for navigations
self.addEventListener('fetch', event => {
  const req = event.request;

  // For HTML navigations, always return cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached)
    );
    return;
  }

  // For other GET requests, try cache first, then network, and cache new files
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          // Only cache same-origin, successful GETs
          if (
            networkRes &&
            networkRes.status === 200 &&
            req.url.startsWith(self.location.origin)
          ) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(req, networkRes.clone())
            );
          }
          return networkRes;
        });
      }).catch(() => {
        // As a last resort (e.g. image requests), you could return a placeholder
      })
    );
  }
});
