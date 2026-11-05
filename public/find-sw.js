// Service worker de find.comix-ci.com : met en cache la page seulement.
// Les données (API) ne sont JAMAIS mises en cache : elles sont personnelles.
const CACHE = "comix-find-v4";
const FICHIERS = ["/find.html", "/find-manifest.json", "/icon-192.png", "/icon-512.png", "/favicon-32.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/find.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
