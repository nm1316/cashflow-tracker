self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname === 'api.jsonbin.io' && event.request.method === 'PUT') {
    event.respondWith(
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.request.body,
        cache: 'no-cache'
      }).then(r => {
        return new Response(JSON.stringify({ record: [], meta: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});
