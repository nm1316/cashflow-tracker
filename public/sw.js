const CACHE_NAME = 'cashflow-v4';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    () => self.clients.claim()
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  if (url.hostname.includes('jsonbin.io') || url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
});
