const STATIC_CACHE = 'static-cache-v1';
const API_CACHE = 'api-cache-v1';

const PRECACHE_ASSETS = [
  '/',
  '/images/signature.png',
  '/sounds/notification.mp3'
];

// 1. Install Event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== API_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Check if request is a menu API fetch
  if (url.pathname.includes('/api/branches/') && url.pathname.includes('/menu')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If response is valid, clone it and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed: Serve menu from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If cache is empty and offline, return a structured fallback error
            return new Response(
              JSON.stringify({
                error: {
                  code: 'OFFLINE_ERROR',
                  message: 'You are currently offline. Please check your connection.'
                }
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Intercept images, fonts, and static chunks (Cache-First)
  const isStaticAsset = 
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.includes('/_next/static/') ||
    PRECACHE_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Fallback image if a specific menu image is requested but offline
          if (request.destination === 'image') {
            return caches.match('/images/signature.png');
          }
        });
      })
    );
    return;
  }

  // Pass all other requests (such as POST order submissions) through to network
  event.respondWith(fetch(request));
});
