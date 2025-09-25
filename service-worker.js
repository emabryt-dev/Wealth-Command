const CACHE_NAME = 'wealth-command-cache-v1';
const urlsToCache = [
  '/Wealth-Command/',
  '/Wealth-Command/index.html',
  '/Wealth-Command/styles.css',
  '/Wealth-Command/app.js',
  '/Wealth-Command/manifest.json',
  '/Wealth-Command/icons/icon-192.png',
  '/Wealth-Command/icons/icon-512.png'
];

// Install: cache files
self.addEventListener('install', event => {
  console.log('Service Worker: Installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Fetch: serve cached files, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request)
          .catch(() => caches.match('/Wealth-Command/index.html'));
      })
  );
});
