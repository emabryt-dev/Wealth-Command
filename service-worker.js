// service-worker.js
const CACHE_NAME = 'wealth-cmd-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', event => {
  const req = event.request;
  // Serve navigation requests (HTML) from cache
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html'));
    return;
  }
  // For other GET requests, try cache first, then network
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(networkRes => {
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
      })
    );
  }
});
