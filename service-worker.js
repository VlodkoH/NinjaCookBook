/* NinjaCookBook Service Worker.
 * Bump CACHE_VERSION whenever any file in APP_SHELL (or recipes.json) changes. */
const CACHE_VERSION = 'v5';
const CACHE_PREFIX = 'ninjacookbook-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;

// Paths are relative to the SW location, so the app works from a subpath.
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/theme-init.js',
  'js/app.js',
  'js/data.js',
  'js/storage.js',
  'js/theme.js',
  'js/utils.js',
  'js/components.js',
  'js/wakelock.js',
  'js/add-recipe.js',
  'js/views/home.js',
  'js/views/recipe.js',
  'js/views/recipe-edit.js',
  'data/recipes.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'images/recipe-placeholder.svg',
  'images/plov.svg'
];

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((p) => new Request(scopeUrl(p), { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function putInCache(cacheName, request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    return await putInCache(cacheName, fallbackUrl || request, response);
  } catch {
    const cached = await caches.match(fallbackUrl || request, { ignoreSearch: true });
    if (cached) return cached;
    throw new Error('offline and not cached');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    return await putInCache(RUNTIME_CACHE, request, response);
  } catch {
    if (request.destination === 'image') {
      const placeholder = await caches.match(scopeUrl('images/recipe-placeholder.svg'));
      if (placeholder) return placeholder;
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, scopeUrl('index.html')));
    return;
  }
  if (url.pathname.endsWith('/data/recipes.json')) {
    event.respondWith(networkFirst(request, SHELL_CACHE, scopeUrl('data/recipes.json')));
    return;
  }
  event.respondWith(cacheFirst(request));
});
