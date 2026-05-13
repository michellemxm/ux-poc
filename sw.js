const CACHE = "kiro-v8";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/kiro-app.png",
  "./assets/logo-kiro-ghost.svg",
  "./assets/logo-kiro-text.svg",
  "./assets/icon-inbox.svg",
  "./assets/icon-image.svg",
  "./assets/icon-lightbulb-empty.svg",
  "./assets/icon-symbol-misc.svg",
  "./assets/icon-search.svg",
  "./assets/icon-sort-precedence.svg",
  "./assets/icon-edit.svg",
  "./fonts/AWSDiatypeRounded-Regular.otf",
  "./fonts/AWSDiatypeRounded-Medium.otf",
  "./fonts/AWSDiatypeRounded-Heavy.otf",
  "./fonts/AWSDiatypeRounded-Light.otf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Force every controlled client to reload so the new shell renders
    // on a single relaunch instead of waiting for a second.
    const clients = await self.clients.matchAll({ type: "window" });
    for (const c of clients) {
      try { c.navigate(c.url); } catch (_) {}
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Network-first for navigations (HTML) so layout/markup updates
  // take effect on the next launch even when offline-cache exists.
  if (req.mode === "navigate" || (req.destination === "" && req.headers.get("accept")?.includes("text/html"))) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Stale-while-revalidate for everything else (CSS/JS/fonts/icons).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
