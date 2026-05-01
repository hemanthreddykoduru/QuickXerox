const CACHE_NAME = "quickxerox-v5";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  // Force this new service worker to become the active one,
  // bypassing the "waiting" state.
  self.skipWaiting(); 

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Tell the active service worker to take control of the page immediately.
      self.clients.claim(),
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - same-origin NETWORK FIRST, cross-origin passthrough
// Critically: do NOT call respondWith() for cross-origin requests.
// If we fetch() them inside the SW, the browser applies connect-src CSP,
// which blocks scripts/images that are allowed via script-src/img-src.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin — let browser handle them natively
  if (url.origin !== location.origin) return;

  // Same-origin: network first, fall back to cache for offline
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
