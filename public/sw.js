const CACHE_NAME = "kannada-buddy-v2";
const APP_SHELL = [
  "/",
  "/travel",
  "/phrasebook",
  "/review",
  "/library",
  "/admin",
  "/sources",
  "/manifest.json",
  "/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match("/")))
    );
    return;
  }

  const fresh = fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
    }
    return response;
  });
  event.waitUntil(fresh.then(() => undefined).catch(() => undefined));

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fresh;
    })
  );
});
