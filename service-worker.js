// service-worker.js

// 1. Versioned cache names
const STATIC_CACHE  = 'wealth-cmd-static-v2';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v2';

// 2. App shell files to precache
const APP_SHELL = [
  '/',                  // so navigate requests hit index.html
  '/index.html',
  '/app.js',
  '/app.css',           // if you have a CSS file
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 3. Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 4. Activate: clean up old caches
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

// 5. Fetch: implement caching strategies
self.addEventListener('fetch', event => {
  const req  = event.request;
  const url  = new URL(req.url);

  // 5a. Navigation requests → serve index.html from static cache
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => 
        cached || fetch(req)
      )
    );
    return;
  }

  // 5b. App shell (static) → cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => 
          cached || fetch(req).then(networkRes => {
            cache.put(req, networkRes.clone());
            return networkRes;
          })
        )
      )
    );
    return;
  }

  // 5c. Everything else (JSON, images, API) → stale-while-revalidate
  if (req.method === 'GET') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(networkRes => {
            // only cache valid responses
            if (networkRes && networkRes.status === 200) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          });
          // return cached immediately if available, otherwise wait for network
          return cached || networkFetch;
        })
      )
    );
  }
});

// 6. Background Sync listener (skeleton)
//    You need to implement `processTransactionQueue()`
//    which reads your queued items (e.g. from IndexedDB) and POSTS them.
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      processTransactionQueue()
        .catch(err => console.error('Sync failed:', err))
    );
  }
});

// 7. Stub for processing your offline queue
//    Replace this with your IndexedDB logic + fetch calls
async function processTransactionQueue() {
  // Example stub:
  // const queued = await readAllQueuedTransactionsFromIDB();
  // for (let tx of queued) {
  //   await fetch('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
  //   await removeQueuedTransactionFromIDB(tx.id);
  // }
  console.log('⚡️ processTransactionQueue() called, but no queue is implemented yet.');
}
