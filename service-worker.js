/* JAIDYN TRAIN — service worker
   - HTML / navigations  -> NETWORK FIRST (newest deploy always wins when online)
   - other assets         -> CACHE FIRST  (fast; offline fallback)
   Bump CACHE_VERSION whenever you want to force-clear old caches. */

const CACHE_VERSION = 'jaidyn-train-v15';
const APP_SHELL = './';

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    const keys = await caches.keys();
    await Promise.all(keys.map(function(k){ return k === CACHE_VERSION ? null : caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isHTML) {
    event.respondWith((async function() {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || caches.match(APP_SHELL);
      }
    })());
    return;
  }

  event.respondWith((async function() {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) { return cached; }
  })());
});
