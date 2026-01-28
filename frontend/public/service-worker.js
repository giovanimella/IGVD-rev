// Service Worker para IGVD PWA
const CACHE_NAME = 'igvd-cache-v1';

// Arquivos para cachear (básico)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Ignorar requests que não podem ser cacheados
  if (
    event.request.method !== 'GET' ||
    event.request.url.startsWith('chrome-extension://') ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clone e guarde no cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Se falhar (offline), tenta buscar do cache
        return caches.match(event.request);
      })
  );
});
