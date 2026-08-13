const CACHE_NAME = "terminabfrage-v3";
const APP_SHELL = ["/", "/teilnahme/", "/login/", "/manifest.webmanifest", "/pwa-192x192.png", "/pwa-512x512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => { const copy=response.clone(); void caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,copy)); return response; }).catch(()=>caches.match(event.request).then((cached)=>cached||caches.match("/"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{const copy=response.clone();void caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,copy));return response;})));
});
