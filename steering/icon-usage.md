# Icon Usage

> Guidelines for sourcing, adding, and coloring icons in the UI.
> Related: [Asset Naming Convention](asset-naming-convention.md)

---

## Sourcing order

When implementing a new UI, follow this order **every time** before adding any icon markup:

### 1. Check `/assets` first

Look in the `/assets` folder for an existing `icon-*.svg` that matches the need.
If it exists, **always reuse it** — do not duplicate, rename, or re-import.

### 2. Fall back to `kiro-ds-icons`

If `/assets` does not have it, check the `kiro-ds-icons/` folder (sibling repo at `/Users/mxiaomen/Developer/kiro-ds-icons`).
If a matching icon is available there:
- Copy the SVG into `/assets/`.
- Rename it with the `icon-` prefix and kebab-case (e.g. `archive.svg` → `icon-archive.svg`).
- Use the copied asset from `/assets/` — do not reference `kiro-ds-icons/` directly from app code.

### 3. Placeholder + alert

If the icon does not exist in either location:
- Render a **solid pink square** (`#FF00FF` / magenta) at the icon's target size as a placeholder.
- Explicitly alert the user in the response: *"New icon needed: `<name>` — not found in `/assets` or `kiro-ds-icons`."*
- Do not invent or generate a custom SVG.

---

## Coloring

- Icons must be **tinted via theming**, not via hard-coded color values per icon.
- All icon SVGs ship with a **white fill** base; color is applied through CSS filters / variables on the `<img>` element (see [Asset Naming Convention](asset-naming-convention.md)).
- Use existing color classes (`.icon-dark`, `.icon-muted`, etc.) or context-scoped filters that reference theme tokens.
- Never set `fill="#..."` inline on an SVG to recolor it for a specific use case.
- Theme switches (light / dark / system) should recolor icons automatically through the cascade — no per-icon overrides.
