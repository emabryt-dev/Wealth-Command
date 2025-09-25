const CACHE_NAME = 'wealth-command-v1.3';
const DATA_CACHE_NAME = 'wealth-command-data-v1.3';

// Install event - cache the main page and essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll([
          '/',
          '/index.html',
          './', // Current directory
          'index.html'
        ]);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting on install');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('Service Worker: Cache addAll error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the page if it's successful
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If offline, return cached version
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to cached index.html
              return caches.match('/index.html')
                .then((indexResponse) => {
                  if (indexResponse) {
                    return indexResponse;
                  }
                  return caches.match('index.html')
                    .then((localIndex) => {
                      return localIndex || new Response('Offline - Please check your connection');
                    });
                });
            });
        })
    );
    return;
  }

  // Handle API/data requests
  if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || new Response(JSON.stringify({ offline: true }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Offline fallback for CSS
            if (event.request.url.includes('.css')) {
              return new Response('', { headers: { 'Content-Type': 'text/css' } });
            }
            // Offline fallback for JS
            if (event.request.url.includes('.js')) {
              return new Response('// Offline', { headers: { 'Content-Type': 'application/javascript' } });
            }
          });
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      syncPendingData()
    );
  }
});

// Sync pending data when back online
function syncPendingData() {
  return new Promise((resolve) => {
    console.log('Background sync: Syncing pending data...');
    // Here you would sync with your server
    resolve();
  });
  // service-worker.js - DEBUG VERSION
const CACHE_NAME = 'wealth-command-v1.4';
const urlsToCache = [
  '/',  // Root path
  '/index.html',
  './index.html',
  'index.html'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Attempting to cache URLs:', urlsToCache);
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('Service Worker: All resources cached successfully');
            return self.skipWaiting();
          })
          .catch((error) => {
            console.log('Service Worker: Cache error:', error);
            // Try caching individually to see which URL works
            return cacheIndividualUrls(cache);
          });
      })
  );
});

// Helper function to cache URLs individually
function cacheIndividualUrls(cache) {
  const promises = urlsToCache.map(url => {
    return cache.add(url)
      .then(() => console.log('Cached successfully:', url))
      .catch(err => console.log('Failed to cache:', url, err));
  });
  return Promise.all(promises);
}

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetching:', event.request.url);
  
  // Handle page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Offline - returning cached version');
          return caches.match('/')
            .then(response => response || caches.match('/index.html'))
            .then(response => response || caches.match('index.html'));
        })
    );
    return;
  }

  // For all other requests, try cache first
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
  // Add this to the end of your service-worker.js
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
}
