const CACHE_NAME = 'wealth-command-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // Add more files if needed
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

// Fetch: serve cached, fallback to network
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching ', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('./index.html')) // Fallback to index.html
  );
});
