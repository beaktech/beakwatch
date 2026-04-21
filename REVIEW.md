# Beakwatch Code Review

Scope: `src/**`, `server/index.js`, root config (`package.json`, `vite.config.js`, `eslint.config.js`, `tailwind.config.js`), `README.md`, and agent-instruction files under `docs/superpowers/`.

No bugs were found that break the running product. Findings are mostly Medium/Low — documentation/cleanliness, small a11y gaps, and a few footguns in hook usage. Lead with the items most worth addressing before an open-source release.

---

## High

_None._

---

## Medium

### 1. `date-fns` dependency is unused
- **File:** `package.json:20`
- **Category:** Dependencies / Bundle weight
- `date-fns` is listed as a `dependencies` entry but no source file imports it. The ~200 KB lib ships nothing to the bundle via tree-shaking if unused, but it bloats `node_modules` and `package-lock.json` and confuses readers about what the project actually relies on. Drop it.

### 2. `useServer` silently swallows fetch failures
- **File:** `src/hooks/useServer.js:7`
- **Category:** Correctness
- `fetch('/api/server').then(r => r.json()).then(setServerInfo)` has no `.catch`. If the endpoint is unreachable during boot (e.g. a transient error), the promise rejects as an unhandled rejection and `serverInfo` stays `null` forever with no retry. Contrast with `usePolling`, which keeps re-running. Either add a `.catch` that logs and optionally retries, or route this through `usePolling` with a long interval.

### 3. `usePolling` re-creates its interval if `fetchFn` is inline
- **File:** `src/hooks/usePolling.js:6-20`
- **Category:** Correctness / Performance (latent)
- `run` depends on `fetchFn`, and the effect depends on `run`. All current callers pass module-scope functions so `fetchFn` is referentially stable, but if a future caller passes `() => fetch(...)` inline, the effect will tear down and recreate the interval on every render — a subtle perf cliff and a source of duplicate requests. Either wrap the inline case in `useCallback` at callsites with a clear docstring here, or capture `fetchFn` in a ref inside `usePolling` so identity changes don't re-start the interval.

### 4. `HeroRotator` fade transition ignores `prefers-reduced-motion`
- **File:** `src/components/hero/HeroRotator.jsx:113`
- **Category:** A11y (Motion)
- The full-screen slide crossfade runs every 20s unconditionally (`transition-opacity duration-500`). `AttributionTooltip` already uses `motion-safe:transition-opacity` — match that pattern here (`motion-safe:transition-opacity motion-safe:duration-500`). Kiosks often share a screen with people who have vestibular sensitivities.

### 5. Sidebar server-switch button has minor a11y gaps
- **File:** `src/components/Sidebar.jsx:37-49`
- **Category:** A11y
- The inline `<svg>` icon is decorative but lacks `aria-hidden="true"` / `role="img"`. The button does have a `title` (which screen readers may or may not announce depending on platform) but no `aria-label`. Add `aria-label` explicitly so the action ("Switch to Garden", etc.) is always announced, and mark the SVG decorative.

### 6. Dead CSS custom property
- **File:** `src/index.css:4`
- **Category:** Docs / Style
- `--color-brand-purple` is defined but no component consumes it (its last use in `StatsBar` was replaced with `text-slate-900`). Remove the token so the palette in `@theme` reflects what's actually used.

---

## Low

### 7. Unused constant in `DailyTopBirds`
- **File:** `src/components/hero/DailyTopBirds.jsx:10`
- **Category:** Style
- `const MAX_CELL_W = 18` is declared alongside the layout constants but never referenced. Either wire it in as a ceiling for `cellW` (`Math.min(MAX_CELL_W, ...)`) or delete it.

### 8. Ref written during render in `HeroRotator`
- **File:** `src/components/hero/HeroRotator.jsx:61-62`
- **Category:** Correctness (React pattern)
- `availableRef.current = slides` runs in the render body. It's idempotent and works under StrictMode, but the review guide flags this pattern. The ref exists so `advance`'s `setTimeout` closure reads the latest `slides`. You can eliminate the ref entirely by writing `advance` as a `useCallback` that depends on `slides.length` (and using `setSlideIndex(i => (i + 1) % slides.length)`), accepting a fresh callback on every slide list change.

### 9. Sentence splitting in `BirdProfile` is fragile
- **File:** `src/components/hero/BirdProfile.jsx:97`
- **Category:** Correctness
- `extract.match(/[^.!?]+[.!?]+/g)` will mis-split on abbreviations ("St. James's Park"), ellipses, and decimals. Low severity because Wikipedia summaries are generally clean, but be aware the first "sentence" could be something like `St.` on its own. If you care, prefer `Intl.Segmenter` with `granularity: 'sentence'`.

### 10. `StatsBar` uses `Date` indirectly via polling but nothing here
- **File:** `src/components/hero/BirdProfile.jsx:50`
- **Category:** Correctness (stale render)
- `const currentHour = new Date().getHours()` is computed in the render body, so the "now" highlight in the hourly chart only updates when the component re-renders. With 60s `useTodayStats` polling that's fine in practice, but around an hour boundary the indicator may lag by up to 60s. Acceptable for a kiosk — noting for awareness.

### 11. Wikipedia HTML-stripping is regex-based
- **File:** `src/utils/wikipedia.js:44-47`
- **Category:** Correctness
- `stripHtml` uses `/<[^>]+>/g`. The stripped text is rendered via React JSX so XSS isn't possible, but malformed markup in a Commons Artist field could produce odd output (e.g. unclosed tags leaving text visible). Low impact; consider `DOMParser` if you see weirdness in practice.

### 12. `/api/server` POST is unauthenticated
- **File:** `server/index.js:57-62`
- **Category:** Security
- README already flags this ("Deploy behind a trusted LAN"). Worth reiterating for the open-source release: any client on the network can change the kiosk's upstream. If distributed to less-trusted networks, gate with a token env var or require requests to come from the loopback interface.

### 13. Planning docs contain pre-change snippets
- **Files:** `docs/superpowers/plans/2026-03-24-beaknik-display.md:1034, 1825`
- **Category:** Docs drift
- These plan docs include `<span>Live from the Canopy</span>` and an assertion for that string, which has since been changed to "Recent sightings" in `Sidebar.jsx`. Planning docs are historical records so strict parity isn't needed — add a note at the top if you intend to keep them, or move them to an `archive/` folder so contributors don't treat them as current.

### 14. Linty nits (grouped)
- **Category:** Style
- `server/index.js:206` uses `app.get('*path', ...)` — the `*path` syntax is Express 5 wildcard, fine, but worth a comment for anyone used to the Express 4 `*` form.
- `Attribution.jsx:16` sets `positionClass` to `'absolute'` when style is provided, relying on the consumer to supply `bottom` / `right` in `style`. A defensive default (e.g. `bottom: 12, right: 12`) would make the component safer against misuse.
- Multiple components mix Tailwind utility classes with raw `style={{...}}` for dynamic pixel values (`Top30Days`, `BirdProfile`). That's appropriate (Tailwind can't JIT from dynamic numbers), but a brief comment convention would help — currently the pattern is implicit.

---

## Tests

Test coverage is broad — nearly every component and hook has a `.test.jsx`/`.test.js` neighbour, and assertions check content rather than just "renders." A few observations:

- **`HeroRotator.test.jsx`** mocks every slide child so it genuinely tests the rotator state machine — good discipline.
- **`usePolling.test.js`** covers happy path, error path (`keeps previous data when a fetch fails`), and `lastSuccessAt` update — solid.
- **`BirdProfile.test.jsx`** does not exercise the new `ResizeObserver`-driven `imageBox` computation. Not a critical branch (the Attribution just doesn't render when `imageBox` is `null`), but worth a note if you want coverage of the bounded-image positioning logic.
- **`DailyTopBirds.test.jsx`** — canvas drawing isn't easy to assert on in jsdom. The test exists to verify the component mounts; that's a known limit, not a gap.

No missing tests on critical flows.

---

## Not Issues

These look suspicious but are intentional:

- **`Sidebar` scrollable pane uses `overflow-hidden` with a gradient fade at the bottom.** Intentional visual treatment, not a missing scrollbar — the list is short and doesn't need scrolling. The `AttributionTooltip`'s `placement="right"` was specifically chosen to avoid being clipped by this container.
- **Module-scope `imageCache` Map in `DailyTopBirds.jsx`.** Deliberate — the comment on line 5 explains it survives effect re-runs across `todayStats` polls so we don't rebuild `HTMLImageElement`s every 60s.
- **`BirdProfile` re-implements its own "rendered image bounds" measurement rather than using CSS.** The reason is `object-contain` letterboxing with unknown image aspect ratio — there's no pure-CSS way to attach the Attribution pill to the actual image edge without measurement. JS is the right call here.
- **`availableRef` in `HeroRotator`** (flagged above as a nit): its reason for existing is valid (letting `setTimeout` callbacks see the latest slide list), even if the render-phase write itself is replaceable.
- **Inline styles for pixel widths** in `Top30Days` and `BirdProfile` bar charts — required because Tailwind's JIT can't compile computed-at-runtime values.
- **Planning docs under `docs/superpowers/`** aren't rendered as user-facing documentation — they're historical artifacts from spec/plan workflows.

---

## Summary

**Overall health:** Good. The codebase is small, focused, and reads cleanly. Components have a consistent structure, hooks encapsulate polling and external-data concerns, and test coverage is broad with real assertions. No render-loop bugs, no XSS vectors, no obviously misused effects.

**Top 3 to fix before open-sourcing:**
1. Remove the unused `date-fns` dependency (and the dead `--color-brand-purple` token, and `MAX_CELL_W`). Clean slate for a first public release.
2. Add `.catch` to `useServer`'s initial fetch so unhandled rejections don't leak in production consoles.
3. Respect `prefers-reduced-motion` on the `HeroRotator` slide crossfade.

**Worth preserving:**
- The `usePolling` abstraction — small, correct, well-tested. It's the backbone of the live data flow and keeps the feature hooks trivial.
- The disk-backed bird-image cache (`server/birdImages.js` + `/birds/:filename`) with its concurrency cap and Wikipedia fallback. Nicely scoped and genuinely useful.
- The slide-rotation state machine in `HeroRotator` — manages data-availability skipping, manual advance, preloading, and crossfade in ~130 lines. Tested in isolation via child-component mocks.
- The testing discipline: real assertions, not "component mounts" smoke tests.
