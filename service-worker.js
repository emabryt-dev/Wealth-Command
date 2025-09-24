// service-worker.js

// 1) Cache version names — bump these on changes
const STATIC_CACHE  = 'wealth-cmd-static-v8';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v8';

// 2) App shell files to precache
const APP_SHELL = [
  '/',                // index.html
  'index.html',
  'app.js',
  'tailwind.css',
  'fa.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 3) Install event — precache app shell
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const url of APP_SHELL) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        await cache.put(url, res.clone());
      } catch (err) {
        console.error('Failed to cache', url, err);
      }
    }
    await self.skipWaiting();
  })());
});

// 4) Activate event — clean up old caches
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

// 5) Fetch event — routing & caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // a) Navigation: network-first, fallback to cached shell
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match('/') || cache.match('index.html');
      }
    })());
    return;
  }

  // b) App shell assets: cache-first
  const path = url.pathname.replace(/^\//, '');
  if (APP_SHELL.includes(path)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const networkRes = await fetch(req);
      if (networkRes.ok) cache.put(req, networkRes.clone());
      return networkRes;
    })());
    return;
  }

  // c) Other GET requests: stale-while-revalidate
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(req);
      const networkFetch = fetch(req).then(networkRes => {
        if (networkRes.ok) cache.put(req, networkRes.clone());
        return networkRes;
      });
      return cached || networkFetch;
    })());
  }
});

// 6) Background sync (optional) — stub for queued transactions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(processTransactionQueue());
  }
});

// 7) Stub function — plug in your IndexedDB queue + POST logic here
async function processTransactionQueue() {
  console.log('processTransactionQueue() called — implement your sync logic');
}
