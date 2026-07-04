/* NinjaCookBook Service Worker — Cache-first shell + runtime cache for images and JSON */
const CACHE_VERSION = 'ninjacookbook-v1';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = '/index.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/recipes.json',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg',
  '/recipe-placeholder.svg'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(ASSET_CACHE).then(cache => {
      return cache.addAll(PRECACHE_ASSETS.map(u => new Request(u, {cache: 'reload'})));
    })
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![ASSET_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Navigate requests -> serve index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        // put fresh index in cache
        const copy = res.clone();
        caches.open(ASSET_CACHE).then(cache => cache.put(OFFLINE_URL, copy));
        return res;
      }).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For JSON (recipes), prefer network, fallback to cache
  if (url.pathname.endsWith('recipes.json')) {
    event.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // For images and SVGs -> cache-first
  if (request.destination === 'image' || request.url.endsWith('.svg')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return res;
        }).catch(() => caches.match('/recipe-placeholder.svg'));
      })
    );
    return;
  }

  // For other assets -> cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        // Put into runtime cache for future
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        return res;
      }).catch(() => {
        // As fallback, serve index for CSS/JS navigations or nothing
        if (request.destination === 'style') return caches.match('/styles.css');
        if (request.destination === 'script') return caches.match('/app.js');
        return new Response('', {status: 503, statusText: 'Offline'});
      });
    })
  );
});

// Message handler from client
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const data = event.data;
  if (data.type === 'recipes-updated') {
    // Optionally handle new recipe: broadcast to clients that recipes changed
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({type: 'reload-recipes'}));
    });
  }
});