if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

/* =====================================================================
   Cross-document view transitions (menu ↔ chat)
   --------------------------------------------------------------------- */
/* `@view-transition { navigation: auto }` in styles.css opts in to the
 * cross-document View Transitions API (Safari 18+). The browser snaps
 * the outgoing page, then crossfades into the new one — we override
 * with a horizontal slide whose direction depends on whether the
 * navigation is going deeper (`forward`) or popping back (`back`).
 *
 * Page hierarchy: index.html is depth 0; chat.html is depth 1. The
 * direction is whichever is deeper minus shallower. */
const PAGE_DEPTH = { "": 0, "index.html": 0, "chat.html": 1 };
function depthFor(href) {
  try {
    const file = new URL(href, location.href).pathname.split("/").pop() || "index.html";
    return PAGE_DEPTH[file] ?? 0;
  } catch (_) { return 0; }
}
function setTransitionDir(fromUrl, toUrl) {
  const dir = depthFor(toUrl) > depthFor(fromUrl) ? "forward" : "back";
  document.documentElement.dataset.transition = dir;
}
window.addEventListener("pageswap", (e) => {
  if (!e.viewTransition || !e.activation) return;
  setTransitionDir(location.href, e.activation.entry?.url || "");
});
window.addEventListener("pagereveal", (e) => {
  if (!e.viewTransition || !e.activation) return;
  setTransitionDir(e.activation.from?.url || "", location.href);
});

/* =====================================================================
   Bottom-sheet dialogs
   --------------------------------------------------------------------- */
/* `<button data-sheet="ID">` → `<dialog id="ID">.showModal()`.
 * Click on backdrop or any `[data-close]` closes. ESC + browser back
 * also close natively.
 *
 * Inside a sheet, `<button data-nav="X">` pushes the matching
 * `<section class="sheet__view" data-view="X">` (forward, slides in
 * from the right). `<button data-back>` pops to the root view (back,
 * slides in from the left). Reopening the sheet always resets to the
 * root view with no animation. */
(function bindSheets() {
  document.querySelectorAll("[data-sheet]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const id = trigger.getAttribute("data-sheet");
      const dlg = document.getElementById(id);
      if (!dlg || typeof dlg.showModal !== "function") return;
      resetSheetToRoot(dlg);
      dlg.showModal();
    });
  });

  document.querySelectorAll("dialog.sheet").forEach((dlg) => {
    dlg.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", () => dlg.close());
    });
    dlg.querySelectorAll("[data-back]").forEach((el) => {
      el.addEventListener("click", () => navigateSheet(dlg, "root", "back"));
    });
    dlg.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        navigateSheet(dlg, el.getAttribute("data-nav"), "forward");
      });
    });
    // Tap on backdrop (target === dialog itself) → close.
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    bindSheetDrag(dlg);
  });

  function navigateSheet(dlg, viewName, direction) {
    const target = dlg.querySelector(`.sheet__view[data-view="${viewName}"]`);
    const current = dlg.querySelector(".sheet__view:not([hidden])");
    if (!target) return;
    if (target === current) return;

    const enterCls = direction === "back" ? "sheet__view--enter-from-left" : "sheet__view--enter-from-right";
    const leaveCls = direction === "back" ? "sheet__view--leave-to-right" : "sheet__view--leave-to-left";

    target.removeAttribute("hidden");
    target.classList.add(enterCls);
    if (current) current.classList.add(leaveCls);

    const cleanup = () => {
      if (current) {
        current.setAttribute("hidden", "");
        current.classList.remove("sheet__view--leave-to-left", "sheet__view--leave-to-right");
      }
      target.classList.remove("sheet__view--enter-from-left", "sheet__view--enter-from-right");
    };
    // Both animations share duration; one timer is enough.
    setTimeout(cleanup, 320);

    // Reset scroll for the freshly revealed view.
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

  /* ------------------------------------------------------------------
     Drag-to-dismiss + drag-up-to-expand
     ------------------------------------------------------------------
     Touch on the drag handle or the header tracks vertical movement
     and translates the panel. On release:
       • Down > 80px → dismiss the sheet.
       • Up   > 60px AND the sheet is half-height → promote to max.
       • Else snap back to translateY(0).
     Touches on the body (scrollable content) are ignored so scrolling
     works normally. */
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
      // Half sheet can be dragged up to expand; max sheet only down.
      const isHalf = dlg.classList.contains("sheet--half");
      if (delta < 0 && !isHalf) delta = 0;
      // Resist over-drag with a soft cap.
      const clamped = delta < 0 ? Math.max(delta, -200) : delta;
      panel.style.transform = `translateY(${clamped}px)`;
      // Stop the underlying scroll while we're actively dragging.
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
})();

/* =====================================================================
   Theme selector (profile sheet → Theme view)
   --------------------------------------------------------------------- */
(function bindThemeSelector() {
  const sheet = document.getElementById("sheet-profile");
  if (!sheet) return;
  const rows = sheet.querySelectorAll("[data-theme]");
  const valueEl = sheet.querySelector("[data-theme-current]");
  const labels = { system: "System", dark: "Dark", light: "Light" };

  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const theme = row.getAttribute("data-theme");
      rows.forEach((r) => {
        const selected = r === row;
        r.classList.toggle("option-row--selected", selected);
        r.setAttribute("aria-checked", String(selected));
      });
      if (valueEl && labels[theme]) valueEl.textContent = labels[theme];
    });
  });
})();
