/**
 * Service Worker para RepoSorter
 * ----------------------------------------------------------
 * Estrategia:
 *  - App shell (HTML, CSS, JS, iconos): cache-first con revalidación en background.
 *  - Recursos cross-origin (CDNs de Tailwind, FontAwesome, Google Fonts, GitHub API):
 *    NO se interceptan → el navegador gestiona la petición normalmente.
 *    Esto evita interferir con el portal https://tecdea.github.io/ y con el resto
 *    de la página del portal padre.
 *  - Solo se cachea lo que vive en el MISMO directorio (o subdirectorios) que este sw.js.
 *    El "scope" efectivo es "./" → el SW solo controla rutas bajo esta subcarpeta.
 *  - Cuando se detecta una actualización, se activa automáticamente (skipWaiting + clients.claim).
 */

const VERSION = 'v1.1.0';
const CACHE_NAME = `reposorter-${VERSION}`;

// Exponer la versión del worker a las páginas controladas que la soliciten.
self.addEventListener('message', (event) => {
  if (event.data !== 'GET_VERSION' || !event.ports?.[0]) return;
  event.ports[0].postMessage({ version: VERSION });
});

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './icon.svg',
  './apple-touch-icon.png',
  './favicon.ico'
];

// --- Install: pre-cachear app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[RepoSorter SW] Error precaching:', err))
  );
});

// --- Activate: limpiar caches antiguas y tomar control ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// --- Fetch: estrategia stale-while-revalidate solo para same-origin en el mismo scope ---
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignorar peticiones no GET (POST a la API de GitHub, etc.)
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // CRÍTICO: nunca interceptar peticiones cross-origin.
  // Esto deja a los CDNs (Tailwind, FontAwesome, Google Fonts) y a api.github.com
  // en manos del navegador, y — sobre todo — evita que el SW afecte a rutas del portal
  // tecdea.github.io fuera del subdirectorio donde vive esta PWA.
  if (url.origin !== self.location.origin) return;

  // No interceptar si la ruta está FUERA de nuestro scope (subdirectorio actual).
  // Esto protege explícitamente al portal padre y al resto del sitio.
  const swScope = self.registration.scope; // p.ej. https://tecdea.github.io/reposorter/
  if (!url.href.startsWith(swScope)) return;

  // Estrategia stale-while-revalidate para el app shell y recursos locales
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((response) => {
          // Solo cachear respuestas básicas 200 OK del mismo origen
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => {
          // Sin red: si era un documento de navegación y no está cacheado,
          // servir index.html como fallback offline (app shell).
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cached || Response.error();
        });

      return cached || network;
    })
  );
});

// --- Message: permitir forzar actualización desde la UI ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
