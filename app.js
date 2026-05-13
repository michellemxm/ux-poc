if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

// DEBUG: render live env() values + viewport metrics so we can see
// exactly what iOS reports for safe-area insets when this is launched
// from the home screen.
function renderEnvReadout() {
  const el = document.getElementById("envReadout");
  if (!el) return;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const top = parseFloat(cs.paddingTop) || 0;
  const right = parseFloat(cs.paddingRight) || 0;
  const bottom = parseFloat(cs.paddingBottom) || 0;
  const left = parseFloat(cs.paddingLeft) || 0;
  probe.remove();

  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const vv = window.visualViewport;
  const docEl = document.documentElement;
  el.textContent =
    `safe-area t:${top} r:${right} b:${bottom} l:${left}\n` +
    `innerH:${window.innerHeight}  outerH:${window.outerHeight}\n` +
    `screen h:${window.screen.height}  avail h:${window.screen.availHeight}\n` +
    `docEl clientH:${docEl.clientHeight}  scrollH:${docEl.scrollHeight}\n` +
    `vv h:${vv ? Math.round(vv.height) : "n/a"} offsetY:${vv ? Math.round(vv.offsetTop) : "n/a"} scale:${vv ? vv.scale.toFixed(2) : "n/a"}\n` +
    `lvh ok:${CSS.supports("height", "100lvh")}  dvh ok:${CSS.supports("height", "100dvh")}\n` +
    `standalone:${standalone} dpr:${window.devicePixelRatio}`;
  el.style.whiteSpace = "pre";
}
window.addEventListener("load", renderEnvReadout);
window.addEventListener("resize", renderEnvReadout);
if (window.visualViewport) window.visualViewport.addEventListener("resize", renderEnvReadout);

document.querySelectorAll(".bottom-bar .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".bottom-bar .tab").forEach((t) => {
      t.classList.remove("tab--active");
      const icon = t.querySelector(".icon");
      if (icon) {
        icon.classList.remove("icon-light");
        icon.classList.add("icon-muted");
      }
    });
    tab.classList.add("tab--active");
    const icon = tab.querySelector(".icon");
    if (icon) {
      icon.classList.remove("icon-muted");
      icon.classList.add("icon-light");
    }
  });
});
