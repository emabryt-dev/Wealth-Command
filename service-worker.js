const CACHE_NAME = 'wealth-command-pwa-v2';
const APP_SHELL = [
  '/',            // Main app root
  '/index.html',  // Main HTML file
  '/manifest.json', // Manifest
  '/assets/icons/icon-192x192.png', // Icon (update path if needed)
  '/assets/icons/icon-512x512.png', // Icon (update path if needed)
  // Add other essential assets you want available offline (CSS, JS, etc)
];

self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell:', APP_SHELL);
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  // Only handle GET requests for same-origin resources
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle navigations (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Optionally cache the response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // If offline, try to serve cached shell or offline page
          return caches.match('/index.html')
            .then(response => response || offlinePage());
        })
    );
    return;
  }

  // For static resources (JS, CSS, images, manifest, etc)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response; // Serve from cache
        }
        // Fetch from network and cache it
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => undefined); // If fail, just fail silently for assets
      })
  );
});

// Offline page for navigation fallback
function offlinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Wealth Command Pro - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial; padding: 2em; text-align: center; background: #f8fafc; color: #333; }
          h1 { font-size: 2em; color: #3b82f6; }
          button { padding: 0.5em 2em; font-size: 1em; background: #3b82f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-top: 1em; }
        </style>
      </head>
      <body>
        <h1>💰 Wealth Command Pro</h1>
        <p>You are offline. Your expense data is safe and will sync once you reconnect.</p>
        <button onclick="location.reload()">Retry</button>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

// Message handler for skipWaiting
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
