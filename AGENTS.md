# Agents Guide — Kiro Mobile PWA

> This file is read by AI coding agents (Claude Code, Cursor, Aider, Windsurf, GPT-based assistants, etc.) and by humans onboarding to this prototype. It captures **how** to extend this codebase so changes stay consistent with what's already shipped.

Treat this as the source of truth. If a request conflicts with what's here, surface the conflict instead of silently breaking convention.

---

## 1. What this project is

A **single-page iOS PWA** prototyping the Kiro mobile app.

- Vanilla HTML, CSS, and a tiny `app.js` — no framework, no build step.
- Designed to be added to the iPhone home screen via Safari's **Add to Home Screen** and run in `display: standalone` mode.
- Must also render correctly in a laptop browser's mobile-emulation dev tools.
- Design source: **Figma — Kiro Mobile App** (`fileKey: RU3tArSio6J2sDNB1I9czI`).
- Design system source: see `steering/*.md` (colors, font ramp, asset naming).

---

## 2. File map

```
ux-poc/
├── index.html              # the whole app (single page)
├── styles.css              # design tokens + components
├── app.js                  # SW registration + light interactivity
├── sw.js                   # service worker (cache-versioned)
├── manifest.webmanifest    # PWA manifest
├── assets/                 # flat folder, no subdirs (see steering/asset-naming-convention.md)
│   ├── icon-*.svg          # 16×16 viewBox, white-fill source
│   ├── logo-*.svg
│   └── kiro-app.png        # 2048×2048 home-screen icon
├── fonts/                  # AWS Diatype Rounded .otf files
└── steering/               # design system specs (markdown)
    ├── design-system-foundation-colors.md
    ├── design-system-font-ramp.md
    └── asset-naming-convention.md
```

When adding a screen: edit `index.html` and `styles.css`. Don't introduce a bundler, framework, or routing library unless the task explicitly calls for it.

---

## 3. PWA setup (the iOS-specific bits that matter)

### Required `<head>` tags

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="theme-color" content="#FFFFFF" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Kiro" />
<link rel="apple-touch-icon" href="./assets/kiro-app.png" />
<link rel="manifest" href="./manifest.webmanifest" />
```

- `viewport-fit=cover` is **mandatory** — without it, `position: fixed` elements don't reach the bottom of the screen in standalone mode, and `env(safe-area-inset-*)` returns zeros.
- `apple-mobile-web-app-status-bar-style`:
  - `default` → dark glyphs (use with light theme).
  - `black-translucent` → light glyphs, page extends behind the status bar (use with dark theme).
- `theme-color` and `manifest.background_color` should match the current theme's `--bg-app`.

### iOS install-time caching (critical)

iOS **bakes the above meta tags into the home-screen shortcut at install time**. Changing any of them later does **not** affect an already-installed PWA. After editing meta tags you must:

1. Delete the home-screen icon (long-press → Delete App).
2. Reload the page in Safari.
3. Share → Add to Home Screen again.

State this in any user-facing message when meta tags change.

---

## 4. Layout system

### App shell pattern

```
<body>
  <div class="app">
    <header class="top-bar">…</header>      <!-- position: fixed; top: 0 -->
    <main class="content">…</main>           <!-- absolute; inset: 0; scrolls -->
    <div class="bottom-bar">…</div>          <!-- position: fixed; bottom: 0 -->
  </div>
</body>
```

Rules:

- `.app` is `position: fixed; inset: 0; height: 100lvh` (with `100vh` fallback). Use `100lvh`, **not** `100vh` or `100dvh`, so iOS paints into the area below the home indicator.
- Top and bottom bars use `position: fixed` (**not** `sticky`). Sticky-inside-a-non-scrolling-container behaves like static and caused the original "gap at the bottom" bug.
- `.content` is `position: absolute; inset: 0` inside `.app`, with `overflow-y: auto`. Its **padding** (not margin) accounts for the fixed bars:
  ```css
  padding-top:    calc(var(--top-bar-h) + env(safe-area-inset-top));
  padding-bottom: calc(var(--bottom-bar-h) + env(safe-area-inset-bottom));
  padding-left:  env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  ```
- Bars include the safe-area inset **inside their own height**, so their translucent background paints into the status-bar / home-indicator zones:
  ```css
  .top-bar    { height: calc(var(--top-bar-h)    + env(safe-area-inset-top));    padding-top:    env(safe-area-inset-top); }
  .bottom-bar { height: calc(var(--bottom-bar-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); }
  ```
- Bars use `backdrop-filter: saturate(180%) blur(20px)` plus a **linear-gradient** that fades alpha to 0 at the edge meeting the scroll content (bottom of top bar, top of bottom bar). The gradient's RGB base is `var(--chrome-rgb)` so theme swaps just change the triplet. Figma uses a "progressive blur"; CSS approximates with a uniform `blur()` — visual is close enough.

```css
.top-bar    { background: linear-gradient(to top,    rgba(var(--chrome-rgb), 0) 0%, rgba(var(--chrome-rgb), 0.85) 30%, rgba(var(--chrome-rgb), 0.85) 100%); }
.bottom-bar { background: linear-gradient(to bottom, rgba(var(--chrome-rgb), 0) 0%, rgba(var(--chrome-rgb), 0.85) 20%, rgba(var(--chrome-rgb), 0.85) 100%); }
```

- "Raised" surfaces (search field, compose button, top-bar action buttons, brand tile) all share **20px radius + `var(--shadow-soft)`** in the light theme. The dark theme sets `--shadow-soft: none` — shadows on dark surfaces look muddy, so they're suppressed.

### Sizes

| Variable | Value | Use |
|---|---|---|
| `--top-bar-h` | `56px` | top bar height (excluding safe area) |
| `--bottom-bar-h` | `68px` | bottom bar height (excluding safe area) |

If a screen needs a different bar height, set these via a per-screen scope (e.g. `body.screen-xyz { --top-bar-h: 64px; }`) rather than overriding component CSS.

---

## 5. Design tokens

### Source of truth

- Colors: `steering/design-system-foundation-colors.md`
- Typography: `steering/design-system-font-ramp.md`

The full color scales (`--purple-100..900`, `--prey-100..900`, etc.) are defined as raw values in `styles.css :root`. **Don't redefine** scale values inside components.

### Semantic tokens (theme-aware)

These are what components read. Never hard-code `rgba(255,255,255,...)` or similar in component CSS.

| Token | Light theme | Used for |
|---|---|---|
| `--bg-app` | `#FFFFFF` | page background |
| `--bg-chrome` | `rgba(255,255,255,0.85)` | translucent top/bottom bars |
| `--bg-surface` | `Prey/100` | inputs, cards |
| `--bg-inverse` | `Plack` | elements that stay dark in either theme (e.g. compose button) |
| `--fg-default` | `Plack` | titles, body text |
| `--fg-muted` | `Prey/500` | secondary text |
| `--fg-subtle` | `Prey/400` | section headers, placeholders |
| `--fg-accent` | `Purple/600` | links, "See all" |
| `--fg-on-inverse` | `White` | text/icons on `--bg-inverse` |
| `--divider` | `Prey/200` | list separators |
| `--hairline` | `rgba(0,0,0,0.08)` | thin lines (rarely used in light theme) |
| `--pressed` | `rgba(0,0,0,0.04)` | `:active` state |
| `--chrome-rgb` | `242, 241, 244` (Prey/100) | RGB triplet used inside the top/bottom bar gradients via `rgba(var(--chrome-rgb), α)` |
| `--shadow-soft` | `0 1px 16px rgba(0,0,0,0.10)` | raised surfaces (search field, compose, top-bar buttons, brand tile). Dark theme overrides to `none`. |

### Typography classes

Use the typography ramp classes (`.h1`, `.h2`, `.primary`, `.secondary`, `.caption`, `.code`, …) defined in `styles.css`. Don't author one-off `font-size`/`line-height` per component unless the design system doesn't cover the case.

Font stack:
- UI: `"AWS Diatype Rounded"` (loaded from `fonts/`)
- System: `-apple-system, BlinkMacSystemFont, ...` (status bar / system labels)
- Mono: `Menlo, ui-monospace, ...` (code)

---

## 6. Theming

The active theme is **Light**. The Dark theme block is kept inline as a `/* … */` comment immediately below it in `styles.css`. When swapping themes later:

- Move the Light block into a `[data-theme="light"]` selector and Dark into `[data-theme="dark"]`, or wrap with `@media (prefers-color-scheme: dark)`.
- Update `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-status-bar-style">`, and `manifest.background_color/theme_color` accordingly.

When adding new tokens:
- Add them to **both** Light and Dark blocks at the same time.
- Add to the semantic table above.
- Use them in components — don't reach for scale values directly.

---

## 7. Icons and assets

### Source

Master icons live in `~/Developer/kiro-ds-icons/`. To use one, **copy** it into `./assets/` — do not reference the external folder. The prototype must be self-contained.

```
cp ../kiro-ds-icons/<name>.svg ./assets/icon-<name>.svg
```

### Conventions (see `steering/asset-naming-convention.md`)

- Filenames: `icon-<name>.svg` (kebab-case), `logo-<name>.svg`, etc. No subfolders inside `assets/`.
- All icon SVGs use **white fill** as the base color.
- Color is applied via **CSS filter** on the `<img>`, never baked into the SVG.
- 16×16 viewBox.

### Icon classes (in `styles.css`)

```html
<img class="icon icon-light"   src="./assets/icon-foo.svg" alt="" />  <!-- theme foreground -->
<img class="icon icon-muted"   src="./assets/icon-foo.svg" alt="" />  <!-- secondary gray -->
<img class="icon icon-subtle"  src="./assets/icon-foo.svg" alt="" />  <!-- tertiary gray -->
<img class="icon icon-on-dark" src="./assets/icon-foo.svg" alt="" />  <!-- always white (on dark surface) -->
<img class="icon icon-dark"    src="./assets/icon-foo.svg" alt="" />  <!-- always black -->
<img class="icon icon-purple"  src="./assets/icon-foo.svg" alt="" />  <!-- Kiro purple -->
```

These read CSS variables (`--filter-icon-fg`, `--filter-icon-muted`, …) so they auto-flip with theme. To add a new tint, define a new `--filter-icon-*` variable in **both** theme blocks and add a class that reads it.

`alt=""` is correct for **decorative** icons. If the icon conveys meaning that isn't otherwise labelled, give it a real `alt`.

---

## 8. Naming conventions

- **CSS classes**: BEM-ish — `.block`, `.block__element`, `.block--modifier`. Example: `.item`, `.item__title`, `.tab--active`.
- **File names**: kebab-case, including HTML/CSS/JS files and assets.
- **CSS variables**: kebab-case, scoped by category prefix: `--bg-*`, `--fg-*`, `--filter-icon-*`, etc.
- **JS**: camelCase for variables/functions, no transpilation step — write ES2020+ that Safari ships.

---

## 9. Service worker

The SW (`sw.js`) does two things:

1. **Precache** the shell + assets on install.
2. **Runtime strategy**:
   - HTML navigations → **network-first** (so layout changes ship on the next online launch).
   - Everything else → **stale-while-revalidate**.

### Versioning protocol (follow every time you change shipped files)

```js
const CACHE = "kiro-vN";   // bump N on every meaningful change
```

When you change `styles.css` or `app.js`:

1. Bump `CACHE` in `sw.js` (`v6` → `v7`).
2. Bump the query string in `index.html`:
   ```html
   <link rel="stylesheet" href="./styles.css?v=7" />
   <script src="./app.js?v=7"></script>
   ```
3. Mention to the user that they need to **force-quit and relaunch** the home-screen app once to pick up the new SW.

Without both bumps, stale clients keep showing the old CSS even after the new SW activates.

---

## 10. Local development

```bash
cd ~/Developer/ux-poc
python3 -m http.server 5173 --bind 0.0.0.0
```

Then:

- **Laptop**: `http://127.0.0.1:5173/` (use Chrome/Safari dev tools mobile emulation, iPhone 16 Pro Max device).
- **iPhone on same Wi-Fi**: `http://<your-LAN-IP>:5173/` — get IP via `ipconfig getifaddr en0`.

Caveat: service workers require HTTPS — they work on `localhost` but **not** over plain `http` on LAN. Add-to-home-screen + layout still work over LAN http; offline caching just doesn't activate.

---

## 11. Figma → code workflow

Two paths depending on Figma seat access:

### A. Figma Dev Mode MCP (preferred when available)

Use the MCP tools `mcp__*__get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`. Requires Dev or Full seat on the file's team.

### B. Figma REST API (fallback)

When MCP can't access the file, use a personal access token + the REST API. **Treat the token as a credential** — don't commit it, prompt the user to rotate it after use.

```bash
TOKEN='figd_…'
FILE='RU3tArSio6J2sDNB1I9czI'
NODE='6:15403'

# Render to PNG
curl -sS -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/images/$FILE?ids=$NODE&scale=2&format=png"

# Node tree (sizes, copy, component refs)
curl -sS -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/files/$FILE/nodes?ids=$NODE&geometry=paths"
```

Use `INSTANCE.componentId` lookups against the `components` map in the response to identify which design-system icon each instance points to (`name=search`, `name=edit`, etc.). Those names map directly to `kiro-ds-icons/<name>.svg`.

---

## 12. Common pitfalls (we hit all of these)

1. **iOS PWA caches meta tags at install time.** Changing `apple-mobile-web-app-status-bar-style` or `viewport-fit` requires a delete + reinstall of the home-screen shortcut to take effect.

2. **`position: sticky` inside a non-scrolling container behaves like `static`.** Use `position: fixed` for bars in an app shell.

3. **`100vh` is not the full screen in iOS PWA.** Use `100lvh` (with `100vh` fallback). `100dvh` excludes the home-indicator area.

4. **The home-indicator area looks like a gap if your bar background isn't painting into it.** Include `env(safe-area-inset-bottom)` in the bar's `height` and `padding-bottom`, with the background on the bar itself.

5. **Cached HTML masks layout fixes.** Bump the SW cache version **and** the asset query-string version together. Tell the user to force-quit + relaunch.

6. **Don't `git add -A` from the wrong directory** — git will try to walk the whole home folder and either fail noisily or stage unrelated files. Always run git from the project root and stage explicit paths when in doubt.

7. **Figma personal access tokens in chat are credentials.** After using one, remind the user to rotate it (Figma → Settings → Personal access tokens).

8. **External icon folders are fragile.** Always copy icons into `./assets/` so the prototype is self-contained.

---

## 13. Git workflow

- The user's preference is **direct commits to `main`**. No feature branches, no PRs, unless explicitly asked.
- Use conventional, imperative commit subjects under ~70 chars. Body explains **why**, not what.
- Co-author trailer:
  ```
  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  ```
- Never `git push --force` to `main`. Never `git rebase -i` or use any interactive git flag.

---

## 14. When you're done with a change

Before reporting "done":

- [ ] Bumped `sw.js` `CACHE` version if any shipped file changed.
- [ ] Bumped `?v=N` query string in `index.html` for `styles.css` / `app.js`.
- [ ] Updated `manifest.webmanifest` `theme_color`/`background_color` if the theme changed.
- [ ] No hard-coded colors in component CSS — everything reads from `--*` tokens.
- [ ] Any new icon was **copied** into `./assets/` (not referenced from `kiro-ds-icons/`).
- [ ] New tokens defined in **both** Light and Dark theme blocks.
- [ ] Tested at 440×956 (iPhone 16 Pro Max CSS px) in dev tools, ideally on device too.
- [ ] If meta tags changed, told the user to reinstall the home-screen shortcut.

---

## 15. What not to do

- Don't add a JS framework (React, Vue, …), bundler (Vite, webpack, …), or CSS preprocessor (Sass, …) unless the user asks for it.
- Don't introduce client-side routing.
- Don't bake colors into SVGs — tint via CSS filter.
- Don't reach for scale tokens (`--prey-700`) inside a component when a semantic token (`--fg-muted`) exists.
- Don't push to `main` with placeholder content unless that's what was requested.
- Don't restart the local server without confirming with the user — they may already have one running and your restart will steal the port.
