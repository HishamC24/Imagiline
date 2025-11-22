const CACHE_NAME = "pwa-cache";
const ASSETS = [
    "/",
    "/index.html",
    "/index.css",
    "/index.js",
    "/pwa.js",
    "/manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.delete(CACHE_NAME).then(() =>
            caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
        )
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
