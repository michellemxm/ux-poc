if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

/* =====================================================================
   Keyboard avoidance — size .app to the visual viewport
   ---------------------------------------------------------------------
   `body { position: fixed; inset: 0 }` blocks document scroll, but iOS
   still OFFSETS the visual viewport to keep a focused input above the
   keyboard, which dragged our layout-fixed bars off-screen. The fix:
   make `.app` exactly match the visual viewport — set its height to
   `visualViewport.height` and translate it by `visualViewport.offsetTop`.
   Because the top/bottom bars are `position: absolute` relative to
   `.app` (not fixed to the layout viewport), they ride with .app:
   the top bar stays at the visible top, the bottom bar sits right
   above the keyboard, and `.content` scrolls between them. One sync
   covers keyboard open, close, and height changes. */
function syncAppToViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const h = Math.round(vv.height);
  const top = Math.round(vv.offsetTop);
  document.querySelectorAll(".app").forEach((app) => {
    app.style.height = h + "px";
    app.style.transform = top ? `translateY(${top}px)` : "";
  });
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncAppToViewport);
  window.visualViewport.addEventListener("scroll", syncAppToViewport);
}

/* =====================================================================
   SPA navigation with same-document View Transitions
   ---------------------------------------------------------------------
   Two separate HTML pages but the navigation between them is handled
   in-document: we fetch the new HTML, swap .app + body-level dialogs,
   and let `document.startViewTransition()` snapshot before/after and
   animate the slide. This avoids the white-flash gap of a real cross-
   document navigation and the JS-induced lag of an intercept+navigate
   approach.

   Page hierarchy: index.html = depth 0, chat.html = depth 1. Going
   deeper is "forward" (new slides in from right); shallower is "back"
   (old slides out to right, new slides in from left). */
const PAGE_DEPTH = { "": 0, "index.html": 0, "chat.html": 1, "newchat.html": 1 };
function depthFor(href) {
  try {
    const file = new URL(href, location.href).pathname.split("/").pop() || "index.html";
    return PAGE_DEPTH[file] ?? 0;
  } catch (_) { return 0; }
}
function directionTo(targetHref) {
  return depthFor(targetHref) > depthFor(location.href) ? "forward" : "back";
}

async function navigateSPA(href, direction) {
  const url = new URL(href, location.href);
  if (url.pathname === location.pathname && url.hash === location.hash && url.search === location.search) return;

  let html;
  try {
    const res = await fetch(url.href, { credentials: "same-origin" });
    html = await res.text();
  } catch (_) {
    // Network/SW failure — fall back to a normal navigation.
    location.href = url.href;
    return;
  }
  const newDoc = new DOMParser().parseFromString(html, "text/html");

  function swap() {
    // Replace .app entirely.
    const newApp = newDoc.querySelector(".app");
    const currentApp = document.querySelector(".app");
    if (newApp && currentApp) {
      currentApp.replaceWith(document.importNode(newApp, true));
    }
    // Replace body-level dialogs (the sheets live next to .app).
    document.querySelectorAll("body > dialog").forEach((d) => d.remove());
    newDoc.querySelectorAll("body > dialog").forEach((d) => {
      document.body.appendChild(document.importNode(d, true));
    });
    // Title + theme-color for the new page.
    document.title = newDoc.title || document.title;
    const newTheme = newDoc.querySelector('meta[name="theme-color"]');
    const curTheme = document.querySelector('meta[name="theme-color"]');
    if (newTheme && curTheme) curTheme.content = newTheme.content;

    // Re-bind all listeners on the freshly inserted DOM.
    init();
  }

  // Push URL before the transition so popstate cleanup is consistent.
  // Use replaceState if popstate triggered us (caller passes via direction
  // === "popstate") — see popstate handler below.
  if (direction !== "popstate") {
    history.pushState({ depth: depthFor(url.href) }, "", url.href);
  }
  const dir = direction === "popstate" ? "back" : direction;
  document.documentElement.dataset.transition = dir;

  if (document.startViewTransition) {
    const t = document.startViewTransition(swap);
    try { await t.finished; } catch (_) {}
  } else {
    swap();
  }
  delete document.documentElement.dataset.transition;
}

// Intercept internal .html link clicks once at the document level
// (delegation survives DOM swaps because document never goes away).
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href]");
  if (!link) return;
  if (link.target === "_blank") return;
  const href = link.getAttribute("href");
  if (!href) return;
  let url;
  try { url = new URL(href, location.href); } catch (_) { return; }
  if (url.origin !== location.origin) return;
  if (!/\.html$/.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash === location.hash) return;

  e.preventDefault();
  navigateSPA(url.href, directionTo(url.href));
}, true);

// Browser back / forward / swipe-back
window.addEventListener("popstate", () => {
  navigateSPA(location.href, "popstate");
});

// Seed initial history entry so we can detect back navigation.
if (!history.state || history.state.depth === undefined) {
  history.replaceState({ depth: depthFor(location.href) }, "", location.href);
}

/* =====================================================================
   Bind everything to the freshly mounted .app + dialogs.
   `init()` is idempotent and gets called both on initial page load and
   after every SPA swap. */
function init() {
  bindSheets();
  bindThemeSelector();
  bindRepoSelect();
  syncAppToViewport();
}

function bindSheets() {
  // Open: anything with `data-sheet="ID"` opens dialog with that id.
  document.querySelectorAll("[data-sheet]").forEach((trigger) => {
    if (trigger.dataset.bound) return;
    trigger.dataset.bound = "1";
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const id = trigger.getAttribute("data-sheet");
      const dlg = document.getElementById(id);
      if (!dlg || typeof dlg.showModal !== "function") return;
      resetSheetToRoot(dlg);
      // Full-screen dim is a body::after scrim toggled via this class —
      // a top-layer <dialog> can't dim behind the iOS status bar.
      document.documentElement.classList.add("sheet-open");
      dlg.showModal();
    });
  });

  document.querySelectorAll("dialog.sheet").forEach((dlg) => {
    if (dlg.dataset.bound) return;
    dlg.dataset.bound = "1";

    dlg.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", () => dlg.close());
    });
    dlg.querySelectorAll("[data-back]").forEach((el) => {
      el.addEventListener("click", () => navigateSheet(dlg, "root", "back"));
    });
    dlg.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => navigateSheet(dlg, el.getAttribute("data-nav"), "forward"));
    });
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    // `close` fires for every close path (X, outside tap, ESC, drag
    // dismiss, repo select). Drop the scrim only when no sheet remains.
    dlg.addEventListener("close", () => {
      if (!document.querySelector("dialog.sheet[open]")) {
        document.documentElement.classList.remove("sheet-open");
      }
    });
    bindSheetDrag(dlg);
  });
}

function navigateSheet(dlg, viewName, direction) {
  const target = dlg.querySelector(`.sheet__view[data-view="${viewName}"]`);
  const current = dlg.querySelector(".sheet__view:not([hidden])");
  if (!target || target === current) return;

  const enterCls = direction === "back" ? "sheet__view--enter-from-left" : "sheet__view--enter-from-right";
  const leaveCls = direction === "back" ? "sheet__view--leave-to-right" : "sheet__view--leave-to-left";

  target.removeAttribute("hidden");
  target.classList.add(enterCls);
  if (current) current.classList.add(leaveCls);

  setTimeout(() => {
    if (current) {
      current.setAttribute("hidden", "");
      current.classList.remove("sheet__view--leave-to-left", "sheet__view--leave-to-right");
    }
    target.classList.remove("sheet__view--enter-from-left", "sheet__view--enter-from-right");
  }, 320);

  const body = target.querySelector(".sheet__body");
  if (body) body.scrollTop = 0;
}

function resetSheetToRoot(dlg) {
  const root = dlg.querySelector('.sheet__view[data-view="root"]');
  if (!root) return;
  dlg.querySelectorAll(".sheet__view").forEach((v) => {
    v.classList.remove(
      "sheet__view--enter-from-left", "sheet__view--enter-from-right",
      "sheet__view--leave-to-left", "sheet__view--leave-to-right"
    );
    if (v === root) v.removeAttribute("hidden");
    else v.setAttribute("hidden", "");
  });
}

function bindSheetDrag(dlg) {
  const panel = dlg.querySelector(".sheet__panel");
  if (!panel) return;
  const grabZones = dlg.querySelectorAll(".sheet__handle, .sheet__header");
  if (!grabZones.length) return;

  let startY = null;
  let delta = 0;
  let active = false;
  let savedTransition = "";

  grabZones.forEach((zone) => {
    zone.addEventListener("touchstart", onStart, { passive: true });
    zone.addEventListener("touchmove", onMove, { passive: false });
    zone.addEventListener("touchend", onEnd);
    zone.addEventListener("touchcancel", onEnd);
  });

  function onStart(e) {
    if (!e.touches || !e.touches[0]) return;
    startY = e.touches[0].clientY;
    delta = 0;
    active = true;
    savedTransition = panel.style.transition;
    panel.style.transition = "none";
  }
  function onMove(e) {
    if (!active || !e.touches || !e.touches[0]) return;
    delta = e.touches[0].clientY - startY;
    const isHalf = dlg.classList.contains("sheet--half");
    if (delta < 0 && !isHalf) delta = 0;
    const clamped = delta < 0 ? Math.max(delta, -200) : delta;
    panel.style.transform = `translateY(${clamped}px)`;
    if (Math.abs(delta) > 4) e.preventDefault();
  }
  function onEnd() {
    if (!active) return;
    active = false;
    panel.style.transition = savedTransition || "";
    const isHalf = dlg.classList.contains("sheet--half");
    panel.style.transform = "";
    if (delta > 80) {
      dlg.close();
    } else if (isHalf && delta < -60) {
      dlg.classList.remove("sheet--half");
      dlg.classList.add("sheet--max");
    }
    delta = 0;
  }
}

/* =====================================================================
   Theme — system / dark / light
   ---------------------------------------------------------------------
   The user's CHOICE ("system" | "dark" | "light", default "system") is
   stored in localStorage. We resolve it (system → prefers-color-scheme)
   to a concrete theme and set data-theme on <html> so CSS only needs a
   single :root[data-theme="dark"] override block. An inline <head>
   bootstrap applies this pre-paint to avoid a flash; this module owns
   updates, the OS-change listener, and the profile-sheet selector. */
const THEME_KEY = "kiro-theme";
const THEME_COLORS = { light: "#F2F1F4", dark: "#19161D" };

function getThemeChoice() {
  try { return localStorage.getItem(THEME_KEY) || "system"; } catch (_) { return "system"; }
}
function systemPrefersDark() {
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function resolveTheme(choice) {
  if (choice === "dark" || choice === "light") return choice;
  return systemPrefersDark() ? "dark" : "light";
}
function applyTheme() {
  const resolved = resolveTheme(getThemeChoice());
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && THEME_COLORS[resolved]) meta.content = THEME_COLORS[resolved];
}
function setThemeChoice(choice) {
  try { localStorage.setItem(THEME_KEY, choice); } catch (_) {}
  applyTheme();
}
// Follow the OS while the choice is "system".
if (window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onOSChange = () => { if (getThemeChoice() === "system") applyTheme(); };
  if (mq.addEventListener) mq.addEventListener("change", onOSChange);
  else if (mq.addListener) mq.addListener(onOSChange);
}
// iOS standalone PWAs often miss the matchMedia "change" event when the
// OS theme flips while backgrounded — re-resolve "system" on return.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && getThemeChoice() === "system") applyTheme();
});
window.addEventListener("pageshow", () => {
  if (getThemeChoice() === "system") applyTheme();
});
applyTheme();

/* Profile sheet → Theme view. Re-run on every init() because the sheet
   markup is replaced on SPA navigation; reflects the stored choice and
   binds the option rows (listener guarded once per dialog element). */
function bindThemeSelector() {
  const sheet = document.getElementById("sheet-profile");
  if (!sheet) return;

  const rows = sheet.querySelectorAll(".option-row[data-theme]");
  const valueEl = sheet.querySelector("[data-theme-current]");
  const labels = { system: "System", dark: "Dark", light: "Light" };

  const reflect = (choice) => {
    rows.forEach((r) => {
      const sel = r.getAttribute("data-theme") === choice;
      r.classList.toggle("option-row--selected", sel);
      r.setAttribute("aria-checked", String(sel));
    });
    if (valueEl && labels[choice]) valueEl.textContent = labels[choice];
  };
  reflect(getThemeChoice());

  if (sheet.dataset.themeBound) return;
  sheet.dataset.themeBound = "1";
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const theme = row.getAttribute("data-theme");
      setThemeChoice(theme);
      reflect(theme);
    });
  });
}

/* =====================================================================
   Connect-repo sheet (newchat.html)
   ---------------------------------------------------------------------
   Single-select repo list. Picking a row marks it selected, then swaps
   the "Connect to a repo" CTA for the chat-input bar and reveals the
   repo/branch dropdown under the empty state (which itself re-opens
   this sheet). Re-bound on every init() since the sheet markup is
   replaced on SPA navigation. */
function bindRepoSelect() {
  const sheet = document.getElementById("sheet-connect-repo");
  if (!sheet || sheet.dataset.repoBound) return;
  sheet.dataset.repoBound = "1";

  const rows = sheet.querySelectorAll(".repo-row");
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      rows.forEach((r) => {
        const selected = r === row;
        r.classList.toggle("repo-row--selected", selected);
        r.setAttribute("aria-checked", String(selected));
      });

      const name = row.querySelector(".repo-row__label")?.textContent?.trim();
      if (name) {
        const pill = document.querySelector(".repo-pill");
        const pillLabel = document.querySelector(".repo-pill__label");
        if (pillLabel) pillLabel.textContent = name + "/main";
        if (pill) pill.hidden = false;

        const connectBar = document.querySelector(".bottom-bar--connect");
        const chatBar = document.querySelector(".bottom-bar--chat");
        if (connectBar) connectBar.hidden = true;
        if (chatBar) chatBar.hidden = false;
      }

      const dlg = row.closest("dialog.sheet");
      if (dlg) dlg.close();
    });
  });
}

// Initial bind.
init();
