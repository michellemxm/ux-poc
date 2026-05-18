const CACHE = "kiro-v42";
const PRECACHE = [
  "./",
  "./index.html",
  "./chat.html",
  "./newchat.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/kiro-app.png",
  "./assets/logo-kiro-ghost.svg",
  "./assets/logo-kiro-text.svg",
  // menu screen icons
  "./assets/icon-inbox.svg",
  "./assets/icon-image.svg",
  "./assets/icon-lightbulb-empty.svg",
  "./assets/icon-symbol-misc.svg",
  "./assets/icon-search.svg",
  "./assets/icon-sort-precedence.svg",
  "./assets/icon-edit.svg",
  // chat screen icons
  "./assets/icon-arrow-left.svg",
  "./assets/icon-chevron-down.svg",
  "./assets/icon-chevron-right.svg",
  "./assets/icon-ellipsis.svg",
  "./assets/icon-add.svg",
  "./assets/icon-mic.svg",
  "./assets/icon-terminal.svg",
  "./assets/icon-play.svg",
  "./assets/icon-eye.svg",
  "./assets/icon-copy.svg",
  "./assets/icon-share.svg",
  "./assets/icon-thumbsup.svg",
  "./assets/icon-thumbsdown.svg",
  "./assets/icon-refresh.svg",
  "./assets/icon-file-code.svg",
  "./assets/icon-close.svg",
  // profile sheet icons
  "./assets/icon-account.svg",
  "./assets/icon-credit-card.svg",
  "./assets/icon-graph-line.svg",
  "./assets/icon-brush.svg",
  "./assets/icon-globe.svg",
  "./assets/icon-bell.svg",
  "./assets/icon-question.svg",
  "./assets/icon-sign-out.svg",
  "./assets/icon-check.svg",
  // new-chat empty state + connect-repo sheet
  "./assets/icon-source-control.svg",
  "./assets/icon-lock.svg",
  // fonts
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
