// service-worker.js

// 1. Versioned cache names — bump these when you change this file
const STATIC_CACHE  = 'wealth-cmd-static-v3';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v3';

// 2. App-shell assets, using paths relative to this service worker’s scope
const APP_SHELL = [
  'index.html',
  'app.js',
  'app.css',          // remove or rename if you don’t actually have app.css
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 3. Install: cache each asset in APP_SHELL one by one, logging failures
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const asset of APP_SHELL) {
      try {
        const response = await fetch(asset);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        await cache.put(asset, response.clone());
      } catch (err) {
        console.error('❌ Failed to cache', asset, err);
      }
    }
    // Activate file immediately
    await self.skipWaiting();
  })());
});

// 4. Activate: remove any old caches that don’t match our names
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

// 5. Fetch: routing and caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 5a. Navigation requests (HTML) → serve index.html from cache, fallback to network
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cachedIndex = await cache.match('index.html');
      return cachedIndex || fetch(req);
    })());
    return;
  }

  // 5b. App-shell assets → cache-first
  const path = url.pathname.replace(/^\//, '');  
  if (APP_SHELL.includes(path)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const networkRes = await fetch(req);
      if (networkRes && networkRes.ok) {
        await cache.put(req, networkRes.clone());
      }
      return networkRes;
    })());
    return;
  }

  // 5c. Everything else (JSON, images, API) → stale-while-revalidate
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

// 6. Background Sync listener (skeleton)
//    Register sync in your page script via:
//      navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-transactions'));
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      processTransactionQueue().catch(err =>
        console.error('Background sync failed:', err)
      )
    );
  }
});

// 7. Stub for processing your offline-queued transactions
async function processTransactionQueue() {
  // TODO: implement IndexedDB queue read + server POST + queue cleanup
  console.log('🔄 processTransactionQueue() called — implement your queue logic here');
}
