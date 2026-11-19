const CACHE_NAME = "gestion-stock-pro-shell-v8";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Always prefer the newest deployed app shell and hashed JS/CSS assets.
  // Fall back to the last cached response only when the network is unavailable.
  if (request.mode === "navigate" || url.pathname.startsWith("/assets/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          const cacheKey = request.mode === "navigate" ? "/" : request;
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || (request.mode === "navigate" ? await caches.match("/") : Response.error());
      })
    );
  }
});
