// Service worker: makes the app installable and keeps the shell usable offline.
// It never touches the API: only same-origin GET navigations and static assets.

const CACHE_VERSION = "exvia-v3";
const OFFLINE_URL = "/offline/";
const NAVIGATION_TIMEOUT_MS = 5000;
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png"];
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];
const BYPASS_PREFIXES = ["/api/", "/admin/", "/static/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstNavigation(request) {
  // A dead connection can hang instead of failing, so give up on the network after a while.
  const timeout = AbortSignal.timeout(NAVIGATION_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: timeout });
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Redirect instead of serving the offline HTML at this URL: Next would hydrate it
    // against the wrong route and render its 404.
    if (new URL(request.url).pathname === OFFLINE_URL) return Response.error();
    return Response.redirect(OFFLINE_URL, 302);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}
