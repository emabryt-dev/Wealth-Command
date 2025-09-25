const CACHE_NAME = 'wealth-command-cache-v3';
const urlsToCache = [
  '/Wealth-Command/',
  '/Wealth-Command/index.html',
  '/Wealth-Command/styles.css',
  '/Wealth-Command/app.js',
  '/Wealth-Command/manifest.json',
  '/Wealth-Command/icons/icon-192.png',
  '/Wealth-Command/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== "GET") return;

  // If navigation request, always respond with index.html from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/Wealth-Command/index.html')
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // For other requests, respond with cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
