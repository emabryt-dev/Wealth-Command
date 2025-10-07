const CACHE_NAME = 'wealth-command-pro-cache-v1'; // Updated cache name

// --- CORRECTED: Updated the list of files to cache ---
const urlsToCache = [
  '/',
  'index.html',
  'styles.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  
  // Core JS Modules
  'js/app.js',
  'js/core/state-manager.js',
  'js/core/ai-engine.js',
  'js/core/analytics-engine.js',
  'js/core/sync-engine.js',
  'js/core/data-persistence.js',
  'js/core/error-handling.js',
  
  // Feature JS Modules
  'js/features/transactions.js',
  'js/features/categories.js',
  'js/features/planner.js',
  'js/features/debt.js',
  'js/features/analytics.js',
  'js/features/voice-commands.js',
  'js/features/notifications.js',
  
  // UI JS Modules
  'js/ui/charts.js',
  'js/ui/animations.js',
  'js/ui/modals.js',
  'js/ui/toasts.js',
  
  // Utils (Assuming these exist based on app.js)
  'js/utils/helpers.js',
  'js/utils/formatters.js',
  'js/utils/validators.js',

  // CDNs
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        // Use addAll with a catch to prevent install failure if one resource fails
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache all resources:', err);
        });
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
  const url = new URL(request.url);

  // Use a network-first strategy for dynamic data or APIs, but not for auth
  if (url.origin.includes('googleapis.com') || url.origin.includes('accounts.google.com')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Use cache-first for app shell resources
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(networkResponse => {
        // Cache the new resource
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, and it's a navigation request, serve the offline page
        if (request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
