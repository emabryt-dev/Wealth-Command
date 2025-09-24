// Wealth Command Pro - Enhanced Service Worker
// Version: 2.1.0

const APP_VERSION = '2.1.0';
const STATIC_CACHE = `wealth-cmd-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `wealth-cmd-dynamic-${APP_VERSION}`;
const OFFLINE_PAGE = './offline.html';

// Core app shell - critical files for offline functionality
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  OFFLINE_PAGE
];

// External resources to cache (optional)
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  console.log(`🔄 [PWA ${APP_VERSION}] Installing Service Worker...`);
  
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        console.log('📦 Caching app shell...');
        
        // Cache app shell with network-first strategy
        const cachePromises = APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.status === 200) {
              await staticCache.put(url, response);
              console.log(`✅ Cached: ${url}`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('🎉 App shell cached successfully');
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Installation failed:', error);
      }
    })()
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  console.log(`🚀 [PWA ${APP_VERSION}] Service Worker activating...`);
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        const cleanupPromises = cacheKeys.map(async (cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            await caches.delete(cacheName);
          }
        });
        
        await Promise.all(cleanupPromises);
        console.log('🧹 Cache cleanup completed');
        
        // Claim clients immediately
        await self.clients.claim();
        console.log('👑 Service Worker now controlling clients');
        
        // Send version info to all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_VERSION',
            version: APP_VERSION,
            status: 'activated'
          });
        });
        
      } catch (error) {
        console.error('❌ Activation failed:', error);
      }
    })()
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different URL types with appropriate strategies
  event.respondWith(handleFetch(event));
});

async function handleFetch(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  try {
    // Strategy 1: App Shell - Cache First
    if (isAppShellRequest(url)) {
      return await cacheFirstStrategy(request);
    }
    
    // Strategy 2: External Resources - Stale While Revalidate
    if (isExternalResource(url)) {
      return await staleWhileRevalidateStrategy(request);
    }
    
    // Strategy 3: API calls - Network First
    if (isApiRequest(url)) {
      return await networkFirstStrategy(request);
    }
    
    // Strategy 4: Default - Network First with Cache Fallback
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('💥 Fetch handling failed:', error);
    
    // Ultimate fallback for navigation requests
    if (event.request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) return offlinePage;
      
      // Create simple offline page
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Offline - Wealth Command</title></head>
          <body>
            <h1>You're offline</h1>
            <p>The app will work when connection is restored.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// ===== CACHING STRATEGIES =====

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`📚 Serving from cache: ${request.url}`);
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    await dynamicCache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE);
      await dynamicCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`🌐 Network failed, using cache: ${request.url}`);
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  // Return cached version immediately
  const cachedResponse = await caches.match(request);
  
  // Fetch and update cache in background
  fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, networkResponse);
      }
    })
    .catch(() => { /* Ignore background update errors */ });
  
  return cachedResponse || fetch(request);
}

// ===== REQUEST CLASSIFICATION =====

function isAppShellRequest(url) {
  const appShellPaths = ['/', '/index.html', '/manifest.json'];
  return appShellPaths.includes(url.pathname) || 
         url.pathname.startsWith('/icons/');
}

function isExternalResource(url) {
  return url.origin.includes('fonts.googleapis.com') ||
         url.origin.includes('cdnjs.cloudflare.com') ||
         url.origin.includes('fonts.gstatic.com');
}

function isApiRequest(url) {
  // Future API endpoints
  return url.pathname.startsWith('/api/');
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Future: Sync transactions when back online
  console.log('📡 Syncing pending transactions...');
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Wealth Command Pro',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-96x96.png',
    tag: data.tag || 'wealth-cmd-notification',
    data: data.url || './',
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
    self.registration.showNotification(data.title || 'Wealth Command', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === event.notification.data && 'focus' in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(event.notification.data);
          }
        })
    );
  }
});

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: APP_VERSION });
      break;
      
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage(status);
      });
      break;
  }
});

async function getCacheStatus() {
  const staticCache = await caches.open(STATIC_CACHE);
  const dynamicCache = await caches.open(DYNAMIC_CACHE);
  
  const staticRequests = await staticCache.keys();
  const dynamicRequests = await dynamicCache.keys();
  
  return {
    staticCache: {
      name: STATIC_CACHE,
      size: staticRequests.length
    },
    dynamicCache: {
      name: DYNAMIC_CACHE, 
      size: dynamicRequests.length
    },
    totalCached: staticRequests.length + dynamicRequests.length
  };
}

// ===== ERROR HANDLING =====
self.addEventListener('error', (event) => {
  console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Service Worker unhandled rejection:', event.reason);
});

console.log(`✅ Wealth Command Pro Service Worker ${APP_VERSION} loaded`);
