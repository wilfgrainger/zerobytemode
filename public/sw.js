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
  // Check if request is for a dynamically loaded Next.js chunk or asset
  const isNextJsAsset = event.request.url.includes('/_next/static/') || event.request.url.includes('/_next/data/');
  const isImage = event.request.destination === 'image';

  // Cache-first strategy for static assets, network-first for others
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return from cache if found
        } else {
          // If not in cache, go to network
          return fetch(event.request)
            .then((res) => {
              // Cache dynamic requests
              if (res.status === 200 && (isNextJsAsset || isImage || event.request.url.startsWith(self.location.origin))) {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then((cache) => {
                    // Use clone as response can only be consumed once
                    cache.put(event.request.url, res.clone());
                    return res;
                  });
              }
              return res; // Return response for other requests
            })
            .catch((err) => {
              // Fallback for offline usage
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html'); // Fallback to app shell for navigation
              }
              // Optionally return an offline page for other failed requests
              // return caches.match('/offline.html');
            });
        }
      })
  );
});
