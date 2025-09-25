const CACHE_NAME = 'wealth-command-pwa-v3';
const APP_SHELL = [
  '/',            
  '/index.html',  
  '/manifest.json',
  '/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add other essential assets if needed (CSS, fonts, etc)
];

// Install event: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch event: respond from cache, update in background
self.addEventListener('fetch', event => {
  // Only handle GET requests and same-origin resources
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  // Navigation requests: try network, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Optionally cache the response
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static resources: cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => undefined)
      )
  );
});

// Listen for skipWaiting message
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Optional: offline fallback page for navigation
function offlinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Wealth Command - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial; background: #f3f4f6; color: #333; text-align: center; padding: 2em; }
          h1 { color: #3b82f6; font-size: 2em; margin-bottom: 1em; }
          button { background: #3b82f6; color: #fff; border: none; padding: 0.6em 2em; border-radius: 4px; font-size: 1em; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>💰 Wealth Command Pro</h1>
        <p>You are offline. Your data is safe and will sync once reconnected.</p>
        <button onclick="location.reload()">Retry</button>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}
