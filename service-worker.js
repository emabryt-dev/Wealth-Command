// service-worker.js

// 1. Versioned cache names — bump these when you change this file
const STATIC_CACHE  = 'wealth-cmd-static-v2';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v2';

// 2. App shell files to precache (use absolute paths)
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 3. Install: cache app shell one-by-one and log any failures
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const url of APP_SHELL) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        await cache.put(url, res.clone());
      } catch (err) {
        console.error('❌ Failed to cache', url, err);
      }
    }
    await self.skipWaiting();
  })());
});

// 4. Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 5. Fetch: routing and caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 5a. Navigation (HTML) → serve index.html from static cache
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(req))
    );
    return;
  }

  // 5b. App shell assets → cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          return cached || fetch(req).then(networkRes => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
      )
    );
    return;
  }

  // 5c. Other GETs (API, images) → stale-while-revalidate
  if (req.method === 'GET') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(networkRes => {
            if (networkRes && networkRes.status === 200) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          });
          return cached || fetchPromise;
        })
      )
    );
  }
});

// 6. Background Sync listener skeleton
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      processTransactionQueue().catch(err =>
        console.error('Sync failed:', err)
      )
    );
  }
});

// 7. Stub for your offline‐queue processing
async function processTransactionQueue() {
  // Example placeholder:
  // const queued = await readAllFromIDB('tx-queue');
  // for (const tx of queued) {
  //   await fetch('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
  //   await deleteFromIDB('tx-queue', tx.id);
  // }
  console.log('⚡️ processTransactionQueue() called — implement your queue logic here');
}
