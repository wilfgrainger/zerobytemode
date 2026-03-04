const CACHE_STATIC_NAME = 'zerobytemode-static-v3';
const CACHE_DYNAMIC_NAME = 'zerobytemode-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html', // For Next.js export, main page might be index.html in the root of 'out'
  '/manifest.json',
  '/logo.svg',
  '/grid.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Note: We don't precache Next.js generated CSS/JS here because the filenames are hashed and change every build.
  // The fetch event listener below will cache them dynamically as they are requested.
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(STATIC_ASSETS.map(asset => {
          // Adjust URLs for Next.js static export if necessary
          const url = new URL(asset, self.location.origin);
          return url.toString();
        }));
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker.
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker ...', event);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
          console.log('[Service Worker] Removing old cache.', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim(); // Ensures that the current page is controlled by the activated SW
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. Skip cross-origin requests (Google Analytics, Stripe, etc.)
  const isInternal = url.origin === self.location.origin;
  
  // 2. Skip Cloudflare internal endpoints
  const isCloudflare = url.pathname.startsWith('/cdn-cgi/');
  
  // 3. Identification of static assets we want to cache
  const isNextJsAsset = url.pathname.includes('/_next/static/') || url.pathname.includes('/_next/data/');
  const isImage = event.request.destination === 'image';
  const isFont = event.request.destination === 'font' || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff');

  // If it's Cloudflare internal or not something we want to manage, bypass SW
  if (isCloudflare || (!isInternal && !isImage && !isFont && !isNextJsAsset)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            // Cache successful dynamic requests for assets
            if (networkResponse && networkResponse.status === 200 && (isInternal || isImage || isFont || isNextJsAsset)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            // Fallback for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Return a safe error response
            return new Response('Resource unavailable offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});
