const CACHE_NAME = 'wealth-command-cache-v10';
const urlsToCache = [
  '/Wealth-Command/',
  '/Wealth-Command/index.html',
  '/Wealth-Command/styles.css',
  '/Wealth-Command/app.js',
  '/Wealth-Command/manifest.json',
  '/Wealth-Command/icons/icon-192.png',
  '/Wealth-Command/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;
  
  const url = new URL(request.url);

  // Don't cache Google APIs (sensitive data)
  if (url.origin.includes('googleapis.com') || url.origin.includes('accounts.google.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // For everything else, use cache-first strategy
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        // Update cache in background if online
        if (navigator.onLine) {
          fetch(request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {}); // Silent fail
        }
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then(networkResponse => {
        // Cache successful responses
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(error => {
        // Network failed - for navigation, try to serve index.html
        if (request.mode === 'navigate') {
          return caches.match('/Wealth-Command/index.html').then(cachedIndex => {
            return cachedIndex || new Response('Wealth Command - Offline');
          });
        }
        
        // For other requests, return appropriate fallbacks
        if (request.destination === 'style' || url.pathname.endsWith('.css')) {
          return new Response('', { headers: { 'Content-Type': 'text/css' } });
        }
        
        if (request.destination === 'script' || url.pathname.endsWith('.js')) {
          return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
        }
        
        // Default fallback
        return new Response('Resource not available offline');
      });
    })
  );
});

// Handle service worker updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
