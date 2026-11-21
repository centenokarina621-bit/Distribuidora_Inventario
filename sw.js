/* Service Worker — Distribuidora Bora PWA */
const CACHE = 'bora-pwa-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/config.js',
  './js/api.js'
];

/* ── Install: pre-cachear archivos estáticos ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: eliminar cachés antiguas ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: estrategia según tipo de petición ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* 1. Supabase y peticiones de red pura → siempre network-only */
  if (
    url.hostname.includes('supabase.co') ||
    ['POST','PUT','DELETE','PATCH'].includes(e.request.method)
  ) {
    return; /* dejar pasar sin interceptar */
  }

  /* 2. Fuentes externas (Google Fonts, CDN JS) → network-first sin caché local */
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  /* 3. Archivos locales → network-first con respaldo en caché */
  e.respondWith(
    fetch(e.request)
      .then(res => {
        /* Guardar copia fresca en caché solo si la respuesta es válida */
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
