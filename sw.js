const CACHE = 'mein-helfer-cache-v9';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        './',
        './index.html',
        './manifest.webmanifest',
        './icon.png',
        './icon.svg'
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name =>
            name.startsWith('mein-helfer-cache-') &&
            name !== CACHE
          )
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Fremde Domains (z. B. Chefkoch) nicht durch den Planer-Service-Worker
  // umleiten oder bei Fehlern durch die lokale index.html ersetzen.
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache =>
            cache.put(event.request, copy)
          ).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Nur bei echten Seitenaufrufen auf die App-Startseite zurückfallen.
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        // Keine fremde oder beliebige Anfrage mit index.html beantworten.
        return Response.error();
      })
  );
});
