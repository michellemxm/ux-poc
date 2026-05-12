const CACHE = "kiro-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/kiro-app.png",
  "./assets/logo-kiro-ghost.svg",
  "./assets/logo-kiro-text.svg",
  "./assets/icon-home.svg",
  "./assets/icon-chat.svg",
  "./assets/icon-search.svg",
  "./assets/icon-inbox.svg",
  "./assets/icon-account.svg",
  "./assets/icon-menu.svg",
  "./assets/icon-add.svg",
  "./assets/icon-kiro.svg",
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
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
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
