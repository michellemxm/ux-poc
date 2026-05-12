if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

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
