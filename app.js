if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

/* ----- Bottom-sheet dialogs (chat screen) -----
 * `<button data-sheet="ID">` opens the matching `<dialog id="ID">`.
 * Clicking the backdrop or any `[data-close]` element inside the
 * dialog closes it. ESC + browser back also close via native dialog. */
(function bindSheets() {
  document.querySelectorAll("[data-sheet]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const id = trigger.getAttribute("data-sheet");
      const dlg = document.getElementById(id);
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    });
  });

  document.querySelectorAll("dialog.sheet").forEach((dlg) => {
    // Close on tap of [data-close] elements (the X button).
    dlg.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", () => dlg.close());
    });
    // Close when the backdrop is tapped (clicks that don't land on the
    // panel). The native <dialog> reports the click's target as the
    // dialog itself when the backdrop is pressed.
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  });
})();
