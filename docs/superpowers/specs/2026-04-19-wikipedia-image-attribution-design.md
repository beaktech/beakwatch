# Wikipedia Image Attribution — Design

**Status:** approved
**Date:** 2026-04-19

## Problem

Beakwatch renders bird photos sourced from Wikipedia/Wikimedia Commons in several places. Wikimedia's licensing (CC BY, CC BY-SA, etc.) requires photographer and licence credit wherever the image appears. Today:

- The **large** image surfaces (`LastIdentified`, `RareVisitors`, `BirdProfile`) already render attribution via `Attribution.jsx`, but as a very subtle corner pill (`text-white/50 bg-black/30`, 10px) that is hard to read.
- The **small-thumbnail** surfaces (`Sidebar` 80px, `Top30Days` 40px) show no attribution at all.
- The canvas-drawn thumbnails in `DailyTopBirds` (28px circles) also show no attribution.

An untracked, half-finished `BirdImagePopup.jsx` attempts a richer hover-preview approach but is superseded by the simpler pattern below.

## Goal

Match the [birdnet-go](https://github.com/tphakala/birdnet-go) attribution pattern: a lightweight floating tooltip that appears on hover for small thumbs, plus a clearly visible corner credit on large images. Both must be CSS-only (no JS delays), keyboard-accessible, and use the existing `fetchAttribution` data pipeline.

## Non-goals

- Attribution on the `DailyTopBirds` canvas-drawn thumbs. Adding DOM hit-targets over canvas pixels is disproportionate work for 15 × 28px circles; punted. The spec below does not prevent a follow-up.
- Any change to the `fetchAttribution` / Wikipedia API layer. Data shape stays `{ artist, license }`.
- Link-to-author or link-to-licence URLs. Birdnet-go wraps both in anchors; Beakwatch's current `fetchAttribution` doesn't extract those URLs. Out of scope here; data pipeline stays as-is.

## Design

### 1. Shared hook: `useAttribution(commonName)`

Extract the fetch-and-state logic currently inlined in `Attribution.jsx:4-13` into `src/hooks/useAttribution.js`. Contract:

```js
const attribution = useAttribution(commonName)
// attribution === null        while loading, or when no data
// attribution === { artist, license }  when fetched
```

The hook handles the `alive` flag guard against late-arriving state after unmount (matches the existing pattern called out in `REVIEW.md` "Not Issues").

Both `Attribution` and the new `AttributionTooltip` component consume this hook.

### 2. Small images: `AttributionTooltip.jsx` (new)

Transparent wrapper used around any small-thumbnail call site:

```jsx
<AttributionTooltip commonName={d.commonName}>
  <BirdImage ... />
</AttributionTooltip>
```

Rendered structure:

```jsx
<div className="relative group">
  {children}
  {attribution && (
    <span className="
      pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1
      whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] text-white
      opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
      motion-safe:transition-opacity z-10
    ">
      © {artist} / {license}
    </span>
  )}
</div>
```

Key design points:

- **`bottom-full left-1/2 -translate-x-1/2`** — the tooltip floats *above* the thumbnail, centered. This sidesteps "the label is wider than the thumbnail" because `whitespace-nowrap` lets it overflow the image bounds into the parent layout.
- **Instant reveal** — `group-hover:opacity-100` is CSS-only, no delay (unlike native `title=`).
- **Keyboard accessibility** — `group-focus-within:opacity-100` means a keyboard user who tabs into any focusable child (if added later) also sees the tooltip. Today BirdImage is not focusable, which matches the kiosk's no-input model, so this is future-proofing only.
- **`motion-safe:`** — respects `prefers-reduced-motion`, per REVIEW.md M7.
- **`pointer-events-none`** — the tooltip never intercepts clicks, so it won't interfere with any future clickable wrappers.
- **`z-10`** — ensures it paints above adjacent list items in Sidebar.

When `fetchAttribution` returns `null` (no metadata), the tooltip is simply not rendered — the hover is a no-op, and visually nothing changes. This matches `Attribution.jsx`'s current fail-open behavior.

### 3. Large images: update `Attribution.jsx`

Keep the corner-pill layout (a full-width bottom strip would clash with title text already positioned at bottom-left in `LastIdentified.jsx:29-46` and `BirdProfile.jsx:45-53`). Adjust for visibility:

| Before | After |
|---|---|
| `text-[10px] text-white/50 bg-black/30` | `text-[11px] text-white/70 bg-black/50` |
| `{artist} / {license}` | `© {artist} / {license}` (prefix always when any part is present; join remaining parts with ` / `, same as today) |
| `bottom-2 right-2` | `bottom-3 right-3` |

Everything else (rounded-full pill, `backdrop-blur-sm`, `pointer-events-none`, unmount-safe fetch) is preserved. The component now calls `useAttribution` instead of doing its own `useState`/`useEffect`.

### 4. Wiring

Two call-site changes:

- `src/components/Sidebar.jsx:56-61` — wrap `<BirdImage>` in `<AttributionTooltip commonName={d.commonName}>`.
- `src/components/hero/Top30Days.jsx:16-21` — same wrap.

No other call sites change. `LastIdentified`, `RareVisitors`, `BirdProfile` already use `<Attribution>` and pick up the visibility tweak automatically.

### 5. Cleanup

Delete the untracked staged files (they were never used):

- `src/components/BirdImagePopup.jsx`
- `src/components/BirdImagePopup.test.jsx`

## Data flow

Every `useAttribution(commonName)` call hits the existing `fetchAttribution(commonName)` from `src/utils/wikipedia.js`, which has three tiers of caching:

1. Module-level `attributionCache` Map — zero network after first call within a page load
2. localStorage (`wiki-attr:` prefix, 7-day TTL) — zero network across reloads within a week
3. Network → Wikipedia imageinfo API

With this change, the Sidebar (≤ 10 unique species) and Top30Days (≤ 10 species) each mount one `useAttribution` per thumbnail on first load. First render fires ~20 Wikipedia requests; subsequent renders are entirely cache-served. This is acceptable traffic for Wikimedia's user-agent policy (the existing hero-panel components already do the same for 1–3 birds at a time).

## Testing

- **`src/hooks/useAttribution.test.js`** (new) — asserts fetch succeeds, handles null, ignores late responses after unmount. Mirror of existing `useWikipediaExtract.test.js` structure.
- **`src/components/AttributionTooltip.test.jsx`** (new):
  - renders children unchanged when no attribution data
  - renders tooltip text `© Jane Photographer / CC BY-SA 4.0` when data arrives
  - tooltip is not visible (opacity-0) by default; becomes visible via `group-hover` class
- **`src/components/Attribution.test.jsx`** (update) — adjust the asserted text from `Jane Photographer / CC BY-SA 4.0` to `© Jane Photographer / CC BY-SA 4.0`. The "license only" and "artist only" paths keep the same shape (just the `©` prefix).
- **`src/components/Sidebar.test.jsx`, `src/components/hero/Top30Days.test.jsx`** — verify the wrapping didn't break existing assertions; likely needs adding a mock for `useAttribution` returning `null`, so the tests don't fire real network calls in jsdom.
- **Delete** `src/components/BirdImagePopup.test.jsx`.

## Open questions

None — all points resolved during brainstorming. `DailyTopBirds` canvas attribution punted as a documented non-goal.
