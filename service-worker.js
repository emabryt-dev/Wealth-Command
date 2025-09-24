// Versioned caches—bump these when updating this file
const STATIC_CACHE  = 'wealth-cmd-static-v4';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v4';

// App shell to precache (paths relative to site root)
const APP_SHELL = [
  '/',            
  'index.html',
  'app.js',
  'app.css',       // remove/rename if you don’t have this
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 1. Install: cache each asset one-by-one, logging failures
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const asset of APP_SHELL) {
      try {
        const res = await fetch(asset);
        if (!res.ok) throw new Error(`${res.status}`);
        await cache.put(asset, res.clone());
      } catch (err) {
        console.error('❌ Failed to cache', asset, err);
      }
    }
    await self.skipWaiting();
  })());
});

// 2. Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// 3. Fetch: routing & caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // a) Navigation → network first, fallback to cached '/'
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        return await cache.match('/');
      }
    })());
    return;
  }

  // b) App shell assets → cache-first
  const path = url.pathname.replace(/^\//, '');
  if (APP_SHELL.includes(path)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const networkRes = await fetch(req);
      if (networkRes.ok) {
        cache.put(req, networkRes.clone());
      }
      return networkRes;
    })());
    return;
  }

  // c) Everything else → stale-while-revalidate
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(req);
      const networkFetch = fetch(req).then(networkRes => {
        if (networkRes && networkRes.ok) {
          cache.put(req, networkRes.clone());
        }
        return networkRes;
      });
      return cached || networkFetch;
    })());
  }
});

// 4. Background Sync listener (stub)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(processTransactionQueue());
  }
});

// 5. Stub for processing an offline queue (IndexedDB → POST logic)
async function processTransactionQueue() {
  console.log('🔄 processTransactionQueue() called — implement your queue logic');
}
