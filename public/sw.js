const CACHE_NAME = "quickxerox-v3-fix";
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

// Fetch event - NETWORK FIRST strategy
// This ensures we always get the latest index.html and assets.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Fallback to cache ONLY if network fails (offline)
        return caches.match(event.request);
      })
  );
});
