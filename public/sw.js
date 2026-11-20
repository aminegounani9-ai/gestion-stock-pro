const CACHE_NAME = "direct-stock-project-shell-v9";
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


self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "" }; }
  const title = payload.title || "Stock & Project Management";
  const options = {
    body: payload.body || payload.message || "Une nouvelle activité nécessite votre attention.",
    icon: payload.icon || "/icon-192.svg",
    badge: payload.badge || "/icon-192.svg",
    tag: payload.tag || payload.id || "direct-stock-project-notification",
    renotify: true,
    data: { url: payload.url || "/" }
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) client.postMessage({ type: "APP_NOTIFICATION_PUSH", payload });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url === target && "focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
