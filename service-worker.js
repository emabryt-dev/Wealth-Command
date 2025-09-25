// service-worker.js - SIMPLE VERSION
const CACHE_NAME = 'simple-cache-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Cache the current page
                return cache.addAll([
                    window.location.pathname  // Cache the current page
                ]);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});
