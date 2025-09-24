// service-worker.js

// 1) Cache version - change this when you update your files
const CACHE_NAME = 'wealth-cmd-v1';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v1';

// 2) Files to cache for offline use
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
  // Add other files if you have them: './styles.css', './app.js', etc.
];

// 3) Install event - caches the app shell
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('Service Worker: Install completed');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('Service Worker: Install failed', error);
      })
  );
});

// 4) Activate event - cleans up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activate completed');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// 5) Fetch event - serves cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache new requests for future use
            if (event.request.url.startsWith('http') && 
                networkResponse.status === 200) {
              caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(event.request, networkResponse.clone());
                });
            }
            return networkResponse;
          })
          .catch(error => {
            // If both cache and network fail, you could show an offline page
            console.error('Service Worker: Fetch failed', error);
            
            // For navigation requests, return the cached app shell
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 6) Background sync (optional - for future enhancements)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    // You can add background sync logic here later
  }
});

console.log('Service Worker: Loaded successfully');
