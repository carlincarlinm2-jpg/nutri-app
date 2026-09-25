// Service worker de Nutri.
// Estrategia clave: index.html y las llamadas a /api/* SIEMPRE van a la red primero.
// Esto evita el problema típico de PWAs donde el teléfono se queda "pegado" con una
// versión vieja de la app (o con datos viejos) aunque publiquemos una corrección.
// Los archivos estáticos (íconos, manifest) sí se cachean para que la app abra rápido
// y funcione aunque no haya internet en ese instante (aunque sin poder sincronizar datos).

const CACHE_NAME = 'nutri-static-v2';
const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/broccoli.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a la API (IA, datos en vivo) ni a Supabase.
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    return; // deja que el navegador la maneje normal, sin pasar por el service worker
  }

  // Navegación / index.html: red primero, caché solo como respaldo sin conexión.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estáticos: caché primero (rápido), actualizando en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((resp) => {
        if (resp && resp.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
