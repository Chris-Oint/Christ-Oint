const CACHE_NAME = 'wmb-bible-etude-v1';
const APP_SCOPE = self.registration.scope;
const INDEX_URL = new URL('index.html', APP_SCOPE).href;
const PRECACHE = [
  INDEX_URL,
  new URL('manifest.webmanifest', APP_SCOPE).href,
  new URL('icon-192.png', APP_SCOPE).href,
  new URL('icon-512.png', APP_SCOPE).href,
  new URL('apple-touch-icon.png', APP_SCOPE).href,
  new URL('favicon-32.png', APP_SCOPE).href,
  new URL('data/brochures_z1.json.gz', APP_SCOPE).href,
  new URL('data/brochures_z2.json.gz', APP_SCOPE).href,
  new URL('data/brochures_z3.json.gz', APP_SCOPE).href,
  new URL('data/brochures_z4.json.gz', APP_SCOPE).href,
  new URL('data/brochures_z5.json.gz', APP_SCOPE).href
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Sequential downloads avoid stressing mobile memory while caching the five Bible-study datasets.
    for (const url of PRECACHE) {
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!response.ok) throw new Error(`Impossible de mettre en cache ${url}: ${response.status}`);
      await cache.put(url, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('wmb-bible-etude-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(INDEX_URL, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(INDEX_URL)) || new Response('WMB — Bible d’étude : ouvrez l’application en ligne une première fois pour préparer son utilisation hors ligne.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response('', { status: 504, statusText: 'Hors ligne' });
    }
  })());
});
