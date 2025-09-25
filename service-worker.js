// service-worker.js
const CACHE_NAME = 'wealth-command-github-v1';
const APP_SHELL = [
  '.',  // Current directory (root)
  './', // Root path
  'index.html'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing for GitHub Pages');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened, attempting to add:', APP_SHELL);
        
        // Try to cache the main page using different approaches
        return Promise.all([
          cache.add('.').catch(err => console.log('Failed to cache .:', err)),
          cache.add('./').catch(err => console.log('Failed to cache ./:', err)),
          cache.add('index.html').catch(err => console.log('Failed to cache index.html:', err)),
          cache.add('/emabryt-dev.github.io/').catch(err => console.log('Failed to cache full path:', err)),
          fetch('.').then(response => cache.put('.', response)).catch(err => console.log('Fetch and cache failed:', err))
        ]).then(() => {
          console.log('Cache attempts completed');
          return self.skipWaiting();
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating and claiming clients');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  console.log('Fetching:', url.pathname);
  
  // Only handle GET requests and same-origin requests
  if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.match(request)
          .then((response) => {
            // If found in cache, return it
            if (response) {
              console.log('Serving from cache:', url.pathname);
              return response;
            }
            
            // Otherwise fetch from network
            console.log('Fetching from network:', url.pathname);
            return fetch(request)
              .then((networkResponse) => {
                // Cache the successful response
                if (networkResponse.status === 200) {
                  cache.put(request, networkResponse.clone());
                }
                return networkResponse;
              })
              .catch((error) => {
                console.log('Network failed, trying fallbacks for:', url.pathname);
                
                // For navigation requests, try various fallbacks
                if (request.mode === 'navigate') {
                  return cache.match('.')
                    .then(response => response || cache.match('./'))
                    .then(response => response || cache.match('index.html'))
                    .then(response => response || cache.match('/index.html'))
                    .then(response => {
                      if (response) {
                        return response;
                      }
                      // Ultimate fallback - create a simple offline page
                      return new Response(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Wealth Command Pro - Offline</title>
                            <style>body { font-family: Arial; padding: 20px; text-align: center; }</style>
                          </head>
                          <body>
                            <h1>💰 Wealth Command Pro</h1>
                            <p>You are currently offline.</p>
                            <p>Your expense data is stored locally and will be available when you're back online.</p>
                            <button onclick="location.reload()">Retry</button>
                          </body>
                        </html>
                      `, { headers: { 'Content-Type': 'text/html' } });
                    });
                }
                
                throw error;
              });
          });
      })
  );
});

// Handle messages from the main page
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
