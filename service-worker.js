// service-worker.js

const STATIC_CACHE  = 'wealth-cmd-static-v8';
const DYNAMIC_CACHE = 'wealth-cmd-dynamic-v8';

const APP_SHELL = [
  '/',
  'index.html',
  'app.js',
  'tailwind.css',
  'fa.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(APP_SHELL.map(url =>
      fetch(url)
        .then(res => res.ok && cache.put(url, res.clone()))
        .catch(err => console.error('Cache fail', url, err))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match('/') || cache.match('index.html');
      }
    })());
    return;
  }

  if (APP_SHELL.includes(url.pathname.replace(/^\//, ''))) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const response = await fetch(req);
      if (response.ok) cache.put(req, response.clone());
      return response;
    })());
    return;
  }

  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      return cached || network;
    })());
  }
});
