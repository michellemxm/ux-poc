if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

/* ----- Bottom-sheet dialogs -----
 * `<button data-sheet="ID">` opens the matching `<dialog id="ID">`.
 * Clicking the backdrop or any `[data-close]` element inside the
 * dialog closes it. ESC + browser back also close via native dialog.
 *
 * A sheet can contain multiple `<section class="sheet__view"
 * data-view="…">` panels — only one is visible at a time. Inside a
 * view, `[data-nav="X"]` pushes the matching view; `[data-back]` pops
 * back to the root view. Reopening the dialog always resets to root. */
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
      el.addEventListener("click", () => resetSheetToRoot(dlg));
    });
    dlg.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        const target = el.getAttribute("data-nav");
        showSheetView(dlg, target);
      });
    });
    // Tap on backdrop (target === dialog itself) → close.
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  });

  function showSheetView(dlg, viewName) {
    const views = dlg.querySelectorAll(".sheet__view");
    if (!views.length) return;
    views.forEach((v) => {
      const match = v.getAttribute("data-view") === viewName;
      if (match) {
        v.removeAttribute("hidden");
        v.classList.add("sheet__view--active");
      } else {
        v.setAttribute("hidden", "");
        v.classList.remove("sheet__view--active");
      }
    });
    // Reset scroll so a fresh view starts at the top.
    const body = dlg.querySelector(`.sheet__view[data-view="${viewName}"] .sheet__body`);
    if (body) body.scrollTop = 0;
  }

  function resetSheetToRoot(dlg) {
    if (dlg.querySelector('.sheet__view[data-view="root"]')) {
      showSheetView(dlg, "root");
    }
  }
})();

/* ----- Theme selector (profile sheet → Theme view) -----
 * Radio behaviour: tapping a row marks it as selected, updates the
 * inline value on the root row, and (for now) just visually updates
 * without actually swapping themes. */
(function bindThemeSelector() {
  const sheet = document.getElementById("sheet-profile");
  if (!sheet) return;
  const rows = sheet.querySelectorAll('[data-theme]');
  const valueEl = sheet.querySelector("[data-theme-current]");
  const labels = { system: "System", dark: "Dark", light: "Light" };

  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const theme = row.getAttribute("data-theme");
      rows.forEach((r) => {
        const isSelected = r === row;
        r.classList.toggle("option-row--selected", isSelected);
        r.setAttribute("aria-checked", String(isSelected));
      });
      if (valueEl && labels[theme]) valueEl.textContent = labels[theme];
    });
  });
})();
