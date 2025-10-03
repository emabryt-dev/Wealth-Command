const CACHE_NAME = 'wealth-command-cache-v7';
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
  // SPA routes fallback
  '/Wealth-Command/dashboard',
  '/Wealth-Command/transactions',
  '/Wealth-Command/planner',
  '/Wealth-Command/debt',
  '/Wealth-Command/analytics',
  '/Wealth-Command/settings',
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
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;
  if (request.url.startsWith('moz-extension://')) return;
  
  const url = new URL(request.url);

  // Strategy 1: Navigation requests - Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Strategy 2: Google APIs - Network only (sensitive data)
  if (url.origin.includes('googleapis.com') || url.origin.includes('accounts.google.com')) {
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // Strategy 3: API calls - Network first, then cache
  if (url.pathname.includes('/api/')) {
    event.respondWith(apiFirstStrategy(request));
    return;
  }

  // Strategy 4: External CDN resources - Cache first, with update
  if (url.origin.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirstStrategy(request));
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
    
    // Return offline response
    return new Response(JSON.stringify({ error: 'You are offline', code: 'OFFLINE' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background (silently fail if network fails)
      fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
          cache.put(request, networkResponse);
          enforceCacheSizeLimit(CACHE_NAME);
        }
      }).catch(() => {
        // Silent fail for background updates
      });
      
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    return networkResponse;
  } catch (error) {
    console.log('Cache first strategy failed:', request.url, error);
    
    // Return appropriate fallbacks for CDN resources
    if (request.url.includes('bootstrap.min.css')) {
      return new Response('/* Bootstrap CSS Fallback */', { 
        headers: { 'Content-Type': 'text/css' } 
      });
    }
    
    if (request.url.includes('bootstrap.bundle.min.js')) {
      return new Response('// Bootstrap JS Fallback', { 
        headers: { 'Content-Type': 'application/javascript' } 
      });
    }
    
    if (request.url.includes('bootstrap-icons.css')) {
      return new Response('/* Bootstrap Icons Fallback */', { 
        headers: { 'Content-Type': 'text/css' } 
      });
    }
    
    if (request.url.includes('chart.js')) {
      return new Response('// Chart.js Fallback', { 
        headers: { 'Content-Type': 'application/javascript' } 
      });
    }
    
    // Re-throw for other errors
    throw error;
  }
}

async function navigationStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  
  // Check if we're online first
  try {
    // Quick network check - try to fetch with short timeout
    const networkTest = await Promise.race([
      fetch(request, { signal: AbortSignal.timeout(2000) }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    
    // If network is available, use network first
    if (networkTest.status === 200) {
      console.log('Online - serving fresh content');
      return networkTest;
    }
  } catch (error) {
    console.log('Offline or slow connection, using cache:', error.message);
    // Continue to cache fallback
  }
  
  // For SPA, serve index.html from cache for same-origin navigation
  if (url.origin === self.location.origin) {
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    if (cachedIndex) {
      console.log('Serving SPA from cache');
      
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
  
  // Final fallback - try network or offline page
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    return networkResponse;
  } catch (error) {
    console.log('Final fallback to offline page');
    return offlineFallback();
  }
}

async function staticAssetsStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, try network
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheSizeLimit(CACHE_NAME);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Static asset fetch failed:', request.url, error);
    
    // Provide appropriate fallbacks based on request type
    const url = new URL(request.url);
    
    // For same-origin requests, try index.html as fallback
    if (url.origin === self.location.origin) {
      const fallback = await cache.match('/Wealth-Command/index.html');
      if (fallback) {
        return fallback;
      }
    }
    
    // For CSS files, return empty stylesheet
    if (request.destination === 'style' || request.url.endsWith('.css')) {
      return new Response('/* Fallback CSS */', { 
        headers: { 
          'Content-Type': 'text/css',
          'Cache-Control': 'no-cache'
        } 
      });
    }
    
    // For JS files, return empty script
    if (request.destination === 'script' || request.url.endsWith('.js')) {
      return new Response('// Fallback JavaScript', { 
        headers: { 
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        } 
      });
    }
    
    // For images, return a transparent pixel
    if (request.destination === 'image') {
      const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      return fetch(transparentPixel);
    }
    
    // For everything else, return a generic error response
    return new Response('Resource not available offline', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function offlineFallback() {
  // Only show offline page if we're actually offline
  if (!navigator.onLine) {
    const cache = await caches.open(CACHE_NAME);
    const cachedIndex = await cache.match('/Wealth-Command/index.html');
    
    if (cachedIndex) {
      console.log('Truly offline - serving cached app');
      return cachedIndex;
    }
    
    // Only show the "You are offline" page as last resort
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Wealth Command - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 50px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              margin: 0;
            }
            .offline-container {
              background: rgba(255,255,255,0.1);
              padding: 2rem;
              border-radius: 1rem;
              backdrop-filter: blur(10px);
              max-width: 400px;
              width: 100%;
            }
            h1 { 
              margin-bottom: 1rem; 
              font-size: 1.5rem; 
              font-weight: 600;
            }
            p { 
              margin-bottom: 1.5rem; 
              opacity: 0.9; 
              line-height: 1.5;
            }
            .icon { 
              font-size: 3rem; 
              margin-bottom: 1rem; 
            }
            small {
              opacity: 0.7;
              font-size: 0.9rem;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="icon">📱</div>
            <h1>You are offline</h1>
            <p>Wealth Command will be available when you're back online.</p>
            <small>Your financial data is safe and will sync automatically when connected.</small>
          </div>
        </body>
      </html>`,
      { 
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  } else {
    // If we're online but something went wrong, try to fetch the main app
    try {
      return await fetch('/Wealth-Command/index.html');
    } catch (error) {
      // Last resort - return a simple error
      return new Response('Application loading...', {
        headers: { 'Content-Type': 'text/html' }
      });
    }
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
      // Implement offline transaction queuing here
      syncOfflineTransactions().catch(error => {
        console.error('Background sync failed:', error);
      })
    );
  }
});

// Future: Sync offline transactions when back online
async function syncOfflineTransactions() {
  // This would sync any transactions made while offline
  console.log('Syncing offline transactions...');
  // Implementation would go here
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
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if app is already open
      for (let client of windowClients) {
        if (client.url.includes('/Wealth-Command/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if app not open
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Handle service worker messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling for unhandled rejections
self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});
