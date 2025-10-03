const CACHE_NAME = 'wealth-command-cache-v8';
const API_CACHE_NAME = 'wealth-command-api-cache-v2';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

const CURRENT_CACHES = {
  app: `wealth-command-app-${CACHE_NAME}`,
  api: `wealth-command-api-${API_CACHE_NAME}`
};

const urlsToCache = [
  '/Wealth-Command/',
  '/Wealth-Command/index.html',
  '/Wealth-Command/styles.css',
  '/Wealth-Command/app.js',
  '/Wealth-Command/manifest.json',
  '/Wealth-Command/icons/icon-192.png',
  '/Wealth-Command/icons/icon-512.png',
  // External resources
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
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll failed:', error);
          // Cache essential files individually if batch fails
          return cache.add('/Wealth-Command/index.html')
            .then(() => cache.add('/Wealth-Command/app.js'))
            .then(() => cache.add('/Wealth-Command/styles.css'))
            .then(() => cache.add('/Wealth-Command/manifest.json'))
            .catch(err => console.log('Essential caching failed:', err));
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
          // Delete old caches not in CURRENT_CACHES
          if (!Object.values(CURRENT_CACHES).includes(key)) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      // Clean up old API cache entries
      return caches.open(API_CACHE_NAME).then(cache => {
        return cache.keys().then(requests => {
          const now = Date.now();
          return Promise.all(
            requests.map(request => {
              return cache.match(request).then(response => {
                if (response) {
                  const dateHeader = response.headers.get('date');
                  if (dateHeader) {
                    const fetchedDate = new Date(dateHeader).getTime();
                    if (now - fetchedDate > MAX_CACHE_AGE) {
                      return cache.delete(request);
                    }
                  }
                }
              });
            })
          );
        });
      });
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Strategy 1: Google APIs - Network only (sensitive data)
  if (url.origin.includes('googleapis.com') || url.origin.includes('accounts.google.com')) {
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // Strategy 2: API calls - Network first, then cache
  if (url.pathname.includes('/api/')) {
    event.respondWith(apiFirstStrategy(request));
    return;
  }

  // Strategy 3: External CDN resources - Cache first, with update
  if (url.origin.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Strategy 4: Navigation requests - Always serve the app
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Strategy 5: Static assets - Cache first
  event.respondWith(staticAssetsStrategy(request));
});

// Strategy functions
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Network only strategy failed:', error);
    return new Response(JSON.stringify({ error: 'Network required for this resource' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function apiFirstStrategy(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(API_CACHE_NAME);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Serving API response from cache');
      return cachedResponse;
    }
    
    // Return empty success response instead of error
    return new Response(JSON.stringify({ offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(networkResponse => {
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse);
        enforceCacheSizeLimit(CACHE_NAME);
      }
    }).catch(() => {}); // Silent fail for background update
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    return networkResponse;
  } catch (error) {
    // Return generic fallback for CDN resources
    if (request.url.includes('bootstrap.min.css')) {
      return new Response('/* Fallback CSS - Bootstrap */', { 
        headers: { 'Content-Type': 'text/css' } 
      });
    }
    if (request.url.includes('bootstrap.bundle.min.js')) {
      return new Response('// Fallback JS - Bootstrap', { 
        headers: { 'Content-Type': 'application/javascript' } 
      });
    }
    
    // For other CDN resources, return empty responses
    return new Response('', { 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
}

async function navigationStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  
  // Always return the main app for same-origin navigation
  if (url.origin === self.location.origin) {
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    if (cachedIndex) {
      console.log('Serving app from cache for navigation');
      
      // Background update when online
      if (navigator.onLine) {
        fetch(request).then(networkResponse => {
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse);
            enforceCacheSizeLimit(CACHE_NAME);
          }
        }).catch(() => {}); // Silent fail for background update
      }
      
      return cachedIndex;
    }
  }
  
  // If app not in cache, try to fetch it from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    return networkResponse;
  } catch (error) {
    // Final fallback - try to get the main app from cache again
    console.log('Network failed, trying cache fallback');
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // Ultimate fallback - redirect to main app
    return Response.redirect('/Wealth-Command/');
  }
}

async function staticAssetsStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // For main app files, try to serve from cache even if not matched exactly
  if (url.pathname === '/Wealth-Command/' || url.pathname === '/Wealth-Command/index.html') {
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    if (cachedIndex) return cachedIndex;
  }
  
  // Try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    return networkResponse;
  } catch (error) {
    // Fallbacks for specific file types
    if (request.destination === 'style' || url.pathname.endsWith('.css')) {
      return new Response('', { headers: { 'Content-Type': 'text/css' } });
    }
    
    if (request.destination === 'script' || url.pathname.endsWith('.js')) {
      return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
    }
    
    // For images, return transparent pixel
    if (request.destination === 'image') {
      const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      return fetch(transparentPixel);
    }
    
    // For HTML/document requests, return the main app
    if (request.destination === 'document' || request.mode === 'navigate') {
      const cachedIndex = await cache.match('/Wealth-Command/index.html');
      if (cachedIndex) return cachedIndex;
    }
    
    // Ultimate fallback - return the main app
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    return cachedIndex || new Response('Wealth Command');
  }
}

// Cache size management
async function enforceCacheSizeLimit(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > 100) { // Limit number of items
      // Remove oldest items (keep most recent 80)
      const itemsToRemove = keys.slice(0, keys.length - 80);
      await Promise.all(itemsToRemove.map(key => cache.delete(key)));
      console.log(`Cleaned ${itemsToRemove.length} old items from ${cacheName}`);
    }
  } catch (error) {
    console.log('Cache cleanup error:', error);
  }
}

// Background sync for offline transactions (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      syncOfflineTransactions().catch(error => {
        console.error('Background sync failed:', error);
      })
    );
  }
});

// Future: Sync offline transactions when back online
async function syncOfflineTransactions() {
  console.log('Syncing offline transactions...');
  return Promise.resolve();
}

// Push notifications (future enhancement)
self.addEventListener('push', event => {
  let data = {
    title: 'Wealth Command',
    body: 'New update available',
    icon: '/Wealth-Command/icons/icon-192.png',
    badge: '/Wealth-Command/icons/icon-192.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (error) {
      console.log('Push data parsing error:', error);
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: { 
      url: data.url || '/Wealth-Command/',
      timestamp: Date.now()
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Handle service worker messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handling for unhandled rejections
self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});
