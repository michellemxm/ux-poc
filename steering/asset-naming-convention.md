# Asset Naming Convention

> All static assets live in the `/assets` folder. No subfolders.

---

## Naming Patterns

| Pattern | Usage | Examples |
|---------|-------|----------|
| `icon-*.svg` | All UI icons | `icon-add.svg`, `icon-search.svg`, `icon-chevron-down.svg` |
| `logo-*.svg` | Brand logos | `logo-kiro-ghost.svg`, `logo-kiro-text.svg` |
| `status-bar-*.svg` | iOS system chrome | `status-bar-left.svg`, `status-bar-right.svg` |
| `dynamic-island.svg` | iOS Dynamic Island | — |
| `kiro-app.png` | App icon (home screen) | — |

---

## Icon SVG Rules

- All icon SVGs use **white fill** as the base color.
- Color is applied via **CSS filters** on the `<img>` element — never bake color into the SVG.
- This enables theming by changing CSS variables/filters without touching SVG files.
- Icon dimensions are **16×16px** viewBox.

---

## CSS Color Classes for Icons

| Class | Color | Use case |
|-------|-------|----------|
| `.icon-dark` | Prey/900 (near black) | Default dark icons on light backgrounds |
| `.icon-muted` | Prey/400 (gray) | Placeholder/secondary icons |
| Context-specific filters | Purple/600, etc. | Applied via parent selectors (e.g., `.repo-pill-icon`) |

---

## Notes

- When adding a new icon, copy it from the `icons/` reference folder into `assets/` with the `icon-` prefix.
- Keep icon names lowercase, hyphen-separated (kebab-case).
- Non-icon assets (logos, system chrome, app icon) do not get the `icon-` prefix.
