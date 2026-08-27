const VERSION = "caption-clarity-v5";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/privacy/",
  "/terms/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/images/terrain-listening-768.webp",
  "/images/terrain-listening-1200.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(APP_SHELL);
    const pages = ["/index.html", "/privacy/", "/terms/"];
    const assetPaths = new Set();
    for (const page of pages) {
      const response = await fetch(page, { cache: "reload" });
      const html = await response.text();
      for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) assetPaths.add(match[1]);
    }
    await cache.addAll([...assetPaths]);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![SHELL, RUNTIME].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreVary: true })) || (await caches.match("/index.html", { ignoreVary: true })) || caches.match("/offline.html", { ignoreVary: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(RUNTIME).then((cache) => cache.put(request, response.clone()));
      return response;
    }))
  );
});
