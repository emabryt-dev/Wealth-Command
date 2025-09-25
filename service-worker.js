const CACHE_NAME = 'wealth-command-cache-v3';
const API_CACHE_NAME = 'wealth-command-api-cache-v1';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

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
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll failed:', error);
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
          // Delete old caches
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
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

  // Strategy 1: API calls - Network first, then cache
  if (url.pathname.includes('/api/')) {
    event.respondWith(apiFirstStrategy(request));
    return;
  }

  // Strategy 2: External CDN resources - Cache first, with update
  if (url.origin.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Strategy 3: Navigation requests - Cache first, special handling for SPA
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Strategy 4: Static assets - Cache first
  event.respondWith(staticAssetsStrategy(request));
});

// Strategy functions
async function apiFirstStrategy(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page or error response
    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
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
      }
    }).catch(() => {}); // Silent fail for background update
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return generic fallback for CDN resources
    if (request.url.includes('bootstrap.min.css')) {
      return new Response('/* Fallback CSS */', { headers: { 'Content-Type': 'text/css' } });
    }
    throw error;
  }
}

async function navigationStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try cache first for SPA routing
    const cachedResponse = await cache.match('/Wealth-Command/index.html');
    if (cachedResponse) {
      // Update in background
      fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
          cache.put(request, networkResponse);
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    // Fallback to network
    return await fetch(request);
  } catch (error) {
    // Ultimate fallback - basic offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wealth Command - Offline</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #666; }
          </style>
        </head>
        <body>
          <h1>You are offline</h1>
          <p>Please check your internet connection and try again.</p>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function staticAssetsStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If all else fails, try to return index.html for HTML requests
    if (request.destination === 'document') {
      const fallback = await cache.match('/Wealth-Command/index.html');
      if (fallback) return fallback;
    }
    throw error;
  }
}

// Background sync for offline transactions (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // You could implement offline transaction queuing here
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'New update from Wealth Command',
    icon: '/Wealth-Command/icons/icon-192.png',
    badge: '/Wealth-Command/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/Wealth-Command/' }
  };
  
  event.waitUntil(
    self.registration.showNotification('Wealth Command', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
