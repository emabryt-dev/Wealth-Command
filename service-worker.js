self.addEventListener('install', event => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Basic: just log fetches
  console.log('Service Worker: Fetching ', event.request.url);
});
