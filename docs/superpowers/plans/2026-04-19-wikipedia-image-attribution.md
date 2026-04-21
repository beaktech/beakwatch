# Wikipedia Image Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Wikipedia attribution (photographer + licence) to every bird-photo surface in Beakwatch — as an instant floating tooltip for small thumbnails (birdnet-go style), and as a tuned, clearly visible corner pill for large hero images.

**Architecture:** One shared `useAttribution(commonName)` hook wraps the existing `fetchAttribution` utility. Two presentational components consume it: the existing `Attribution.jsx` (corner-pill, large images) and a new `AttributionTooltip.jsx` (CSS-only hover tooltip wrapping children, small thumbs). Two call sites (`Sidebar`, `Top30Days`) get the wrapper added.

**Tech Stack:** React 19, Tailwind v4, Vitest + React Testing Library, jsdom.

**Spec:** [`docs/superpowers/specs/2026-04-19-wikipedia-image-attribution-design.md`](../specs/2026-04-19-wikipedia-image-attribution-design.md)

---

## File Structure

**Create:**
- `src/hooks/useAttribution.js` — shared fetch + unmount-safe state hook
- `src/hooks/useAttribution.test.js` — tests for the hook
- `src/components/AttributionTooltip.jsx` — hover-tooltip wrapper component
- `src/components/AttributionTooltip.test.jsx` — tests for the wrapper

**Modify:**
- `src/components/Attribution.jsx` — consume `useAttribution`; bump styling (bigger/darker); `©` prefix
- `src/components/Attribution.test.jsx` — update asserted strings to include `©` prefix
- `src/components/Sidebar.jsx:56-61` — wrap `BirdImage` in `AttributionTooltip`
- `src/components/Sidebar.test.jsx` — mock `useAttribution` to prevent real network
- `src/components/hero/Top30Days.jsx:16-21` — wrap `BirdImage` in `AttributionTooltip`
- `src/components/hero/Top30Days.test.jsx` — mock `BirdImage` and `useAttribution`

**Delete:**
- `src/components/BirdImagePopup.jsx` (untracked, superseded)
- `src/components/BirdImagePopup.test.jsx` (untracked, superseded)

---

## Task 1: Create `useAttribution` hook

**Files:**
- Create: `src/hooks/useAttribution.js`
- Test: `src/hooks/useAttribution.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useAttribution.test.js`:

```js
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules() })

describe('useAttribution', () => {
  it('returns attribution for a given common name', async () => {
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockResolvedValue({ artist: 'Jane Photographer', license: 'CC BY-SA 4.0' }),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Wren'))
    await act(async () => {})
    expect(result.current).toEqual({ artist: 'Jane Photographer', license: 'CC BY-SA 4.0' })
  })

  it('returns null while loading', async () => {
    let resolve
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockReturnValue(new Promise(r => { resolve = r })),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Wren'))
    expect(result.current).toBeNull()
    await act(async () => { resolve({ artist: 'A', license: 'B' }) })
  })

  it('returns null when fetchAttribution resolves null', async () => {
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockResolvedValue(null),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Unknown'))
    await act(async () => {})
    expect(result.current).toBeNull()
  })

  it('does nothing when commonName is falsy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ artist: 'x', license: 'y' })
    vi.doMock('../utils/wikipedia.js', () => ({ fetchAttribution: mockFetch }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution(null))
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useAttribution.test.js`
Expected: FAIL — "Failed to resolve import './useAttribution.js'"

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useAttribution.js`:

```js
import { useState, useEffect } from 'react'
import { fetchAttribution } from '../utils/wikipedia.js'

export function useAttribution(commonName) {
  const [attribution, setAttribution] = useState(null)
  useEffect(() => {
    if (!commonName) return
    let alive = true
    setAttribution(null)
    fetchAttribution(commonName).then(a => { if (alive) setAttribution(a) })
    return () => { alive = false }
  }, [commonName])
  return attribution
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useAttribution.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAttribution.js src/hooks/useAttribution.test.js
git commit -m "Add useAttribution hook"
```

---

## Task 2: Refactor `Attribution.jsx` to use hook + new styling

**Files:**
- Modify: `src/components/Attribution.jsx`
- Modify: `src/components/Attribution.test.jsx`

- [ ] **Step 1: Update the test to expect the new `©` prefix**

Replace `src/components/Attribution.test.jsx` with:

```jsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: vi.fn((name) => {
    if (name === 'Eurasian Wren') return { artist: 'Jane Photographer', license: 'CC BY-SA 4.0' }
    if (name === 'License Only') return { artist: null, license: 'CC BY 2.0' }
    if (name === 'Artist Only') return { artist: 'Someone', license: null }
    return null
  }),
}))

import Attribution from './Attribution.jsx'

describe('Attribution', () => {
  it('renders © artist / license when both are present', async () => {
    await act(async () => { render(<Attribution commonName="Eurasian Wren" />) })
    expect(screen.getByText('© Jane Photographer / CC BY-SA 4.0')).toBeInTheDocument()
  })

  it('renders © license only when artist is missing', async () => {
    await act(async () => { render(<Attribution commonName="License Only" />) })
    expect(screen.getByText('© CC BY 2.0')).toBeInTheDocument()
  })

  it('renders © artist only when license is missing', async () => {
    await act(async () => { render(<Attribution commonName="Artist Only" />) })
    expect(screen.getByText('© Someone')).toBeInTheDocument()
  })

  it('renders nothing when attribution is null', async () => {
    const { container } = render(<Attribution commonName="Unknown" />)
    await act(async () => {})
    expect(container.textContent).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Attribution.test.jsx`
Expected: FAIL — test mocks `../hooks/useAttribution.js` but `Attribution.jsx` imports from `../utils/wikipedia.js`, so the real fetch path runs and `©`-prefixed text is not rendered.

- [ ] **Step 3: Update `Attribution.jsx`**

Replace the entire contents of `src/components/Attribution.jsx` with:

```jsx
import { useAttribution } from '../hooks/useAttribution.js'

export default function Attribution({ commonName }) {
  const attribution = useAttribution(commonName)
  if (!attribution) return null

  const parts = [attribution.artist, attribution.license].filter(Boolean).join(' / ')
  if (!parts) return null

  return (
    <span className="absolute bottom-3 right-3 text-[11px] text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full leading-tight pointer-events-none">
      © {parts}
    </span>
  )
}
```

Changes vs. existing: imports from the new hook; adds `© ` prefix; `bottom-3 right-3` (was `bottom-2 right-2`); `text-[11px]` (was `10px`); `text-white/70` (was `50`); `bg-black/50` (was `30`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/Attribution.test.jsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run full suite to catch unintended breakage**

Run: `npm test`
Expected: All tests pass. If `App.test.jsx` or any hero component test broke because it mocked `../utils/wikipedia.js` expecting `Attribution` to call `fetchAttribution` directly, those mocks still satisfy the hook's transitive call — they should still pass. Note: `App.test.jsx:29` already does `fetchAttribution: vi.fn().mockResolvedValue(null)` which remains correct.

- [ ] **Step 6: Commit**

```bash
git add src/components/Attribution.jsx src/components/Attribution.test.jsx
git commit -m "Refactor Attribution to use shared hook and tune styling

- Extract fetch to useAttribution hook
- Add © prefix, bump text to 11px, bg to black/50, text to white/70
- Nudge offset from bottom-2/right-2 to bottom-3/right-3"
```

---

## Task 3: Create `AttributionTooltip` component

**Files:**
- Create: `src/components/AttributionTooltip.jsx`
- Test: `src/components/AttributionTooltip.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/AttributionTooltip.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: vi.fn((name) => {
    if (name === 'Eurasian Wren') return { artist: 'Jane Photographer', license: 'CC BY-SA 4.0' }
    if (name === 'No Data') return null
    return null
  }),
}))

import AttributionTooltip from './AttributionTooltip.jsx'

describe('AttributionTooltip', () => {
  it('renders children unchanged', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    expect(screen.getByAltText('Eurasian Wren')).toBeInTheDocument()
  })

  it('renders the tooltip text when attribution data is available', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    expect(screen.getByText('© Jane Photographer / CC BY-SA 4.0')).toBeInTheDocument()
  })

  it('omits the tooltip when no attribution data is available', () => {
    render(
      <AttributionTooltip commonName="No Data">
        <img alt="No Data" />
      </AttributionTooltip>
    )
    expect(screen.queryByText(/©/)).toBeNull()
  })

  it('wraps children in a group-hover container so CSS reveal works', () => {
    const { container } = render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    const wrapper = container.firstChild
    expect(wrapper.className).toMatch(/group/)
    expect(wrapper.className).toMatch(/relative/)
  })

  it('tooltip uses opacity-0 by default and reveals via group-hover', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    const tooltip = screen.getByText('© Jane Photographer / CC BY-SA 4.0')
    expect(tooltip.className).toMatch(/opacity-0/)
    expect(tooltip.className).toMatch(/group-hover:opacity-100/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/AttributionTooltip.test.jsx`
Expected: FAIL — "Failed to resolve import './AttributionTooltip.jsx'".

- [ ] **Step 3: Implement `AttributionTooltip.jsx`**

Create `src/components/AttributionTooltip.jsx`:

```jsx
import { useAttribution } from '../hooks/useAttribution.js'

export default function AttributionTooltip({ commonName, children }) {
  const attribution = useAttribution(commonName)
  const parts = attribution
    ? [attribution.artist, attribution.license].filter(Boolean).join(' / ')
    : null

  return (
    <div className="relative group">
      {children}
      {parts && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity z-10"
        >
          © {parts}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/AttributionTooltip.test.jsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/AttributionTooltip.jsx src/components/AttributionTooltip.test.jsx
git commit -m "Add AttributionTooltip for small-thumbnail hover attribution"
```

---

## Task 4: Wire `AttributionTooltip` into Sidebar

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/Sidebar.test.jsx`

- [ ] **Step 1: Add the `useAttribution` mock to `Sidebar.test.jsx`**

Edit `src/components/Sidebar.test.jsx`. After the existing `vi.mock('./BirdImage.jsx' ...)` block (around line 4-6), add a second mock so the wrapped `AttributionTooltip` doesn't fire real network calls during the test:

```jsx
vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: () => null,
}))
```

Place it between the existing `BirdImage` mock and the `useServer` mock. The full mock block at the top of the file should read:

```jsx
vi.mock('./BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: () => null,
}))
vi.mock('../hooks/useServer.js', () => ({
  useServer: () => ({ serverInfo: null, switchServer: vi.fn() }),
}))
```

- [ ] **Step 2: Run Sidebar tests to confirm they still pass before the code change**

Run: `npm test -- src/components/Sidebar.test.jsx`
Expected: PASS — 4 tests. The mock is prophylactic; `Sidebar.jsx` doesn't yet import `AttributionTooltip`, so the mock is currently unused but harmless.

- [ ] **Step 3: Update `Sidebar.jsx` to wrap the thumbnail**

Edit `src/components/Sidebar.jsx`:

At the top, add an import on a new line just after the `BirdImage` import (currently line 2):

```jsx
import AttributionTooltip from './AttributionTooltip.jsx'
```

Then, change the BirdImage block (currently lines 56-61) from:

```jsx
<BirdImage
  commonName={d.commonName}
  alt={d.commonName}
  width={80}
  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
/>
```

to:

```jsx
<AttributionTooltip commonName={d.commonName}>
  <BirdImage
    commonName={d.commonName}
    alt={d.commonName}
    width={80}
    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
  />
</AttributionTooltip>
```

- [ ] **Step 4: Run Sidebar tests**

Run: `npm test -- src/components/Sidebar.test.jsx`
Expected: PASS — 4 tests. The wrapper is a plain `<div>`; all text/alt assertions still match.

- [ ] **Step 5: Visually verify in the dev server**

Run in one terminal: `npm run dev`
Open the app in a browser, hover a bird thumbnail in the Sidebar list. Expected: after a fraction of a second (the first hover triggers the Wikipedia request; subsequent hovers on the same species are cache-immediate), a small black tooltip appears above the thumb with `© <photographer> / <licence>`. Mouse-leave dismisses it. If the species has no attribution data, nothing appears on hover — that is the intended fail-open behaviour.

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.test.jsx
git commit -m "Wrap Sidebar thumbnails in AttributionTooltip"
```

---

## Task 5: Wire `AttributionTooltip` into Top30Days

**Files:**
- Modify: `src/components/hero/Top30Days.jsx`
- Modify: `src/components/hero/Top30Days.test.jsx`

- [ ] **Step 1: Add mocks to `Top30Days.test.jsx`**

The existing test has no mocks — `BirdImage` renders through and fires real `/birds/` requests in jsdom (silently failing). Wrapping with `AttributionTooltip` adds a `fetchAttribution` call, which also fires in jsdom. Both should be mocked.

Edit `src/components/hero/Top30Days.test.jsx`. Replace the file contents with:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../../hooks/useAttribution.js', () => ({
  useAttribution: () => null,
}))

import Top30Days from './Top30Days.jsx'

const species = [
  { commonName: 'Eurasian Wren', count: 200 },
  { commonName: 'Robin', count: 150 },
]

describe('Top30Days', () => {
  it('renders heading', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText(/Most Popular Species/i)).toBeInTheDocument()
  })

  it('renders species names with counts', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows rank numbers', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run Top30Days tests to confirm they still pass before the code change**

Run: `npm test -- src/components/hero/Top30Days.test.jsx`
Expected: PASS — 3 tests.

- [ ] **Step 3: Update `Top30Days.jsx` to wrap the thumbnail**

Edit `src/components/hero/Top30Days.jsx`:

Change the import line (currently line 1) from:

```jsx
import BirdImage from '../BirdImage.jsx'
```

to:

```jsx
import BirdImage from '../BirdImage.jsx'
import AttributionTooltip from '../AttributionTooltip.jsx'
```

Then change the BirdImage block (currently lines 16-21) from:

```jsx
<BirdImage
  commonName={s.commonName}
  alt={s.commonName}
  width={40}
  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
/>
```

to:

```jsx
<AttributionTooltip commonName={s.commonName}>
  <BirdImage
    commonName={s.commonName}
    alt={s.commonName}
    width={40}
    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
  />
</AttributionTooltip>
```

- [ ] **Step 4: Run Top30Days tests**

Run: `npm test -- src/components/hero/Top30Days.test.jsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: All tests pass. There is a prior-review caveat about `App.test.jsx` firing real network calls (REVIEW.md M4); that is unchanged by this plan.

- [ ] **Step 6: Visually verify in the dev server**

Run in one terminal: `npm run dev`
Open the app. Find the Most Popular Species panel in the hero rotator. Hover the 40px thumbnails. Expected: same tooltip behaviour as the Sidebar — small black floating `© <photographer> / <licence>` above the thumb. On these tiny thumbnails especially, verify that the tooltip floats *outside* the thumbnail bounds rather than being clipped. The parent `<div>` that contains the row has `items-center` but no `overflow-hidden`, so the tooltip renders correctly.

Stop the dev server once confirmed.

- [ ] **Step 7: Commit**

```bash
git add src/components/hero/Top30Days.jsx src/components/hero/Top30Days.test.jsx
git commit -m "Wrap Top30Days thumbnails in AttributionTooltip"
```

---

## Task 6: Remove untracked superseded `BirdImagePopup` files

**Files:**
- Delete: `src/components/BirdImagePopup.jsx`
- Delete: `src/components/BirdImagePopup.test.jsx`

- [ ] **Step 1: Verify they are not imported anywhere**

Run: grep for any remaining import:

```bash
grep -rn "BirdImagePopup" src/ --include="*.jsx" --include="*.js"
```

Expected: only lines inside `BirdImagePopup.jsx` and `BirdImagePopup.test.jsx` themselves. If any other file imports it, stop and investigate — the brainstorming assumed these were half-finished/unwired, so an unexpected import means the assumption was wrong.

- [ ] **Step 2: Delete the files**

```bash
rm src/components/BirdImagePopup.jsx src/components/BirdImagePopup.test.jsx
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Run lint and build to catch anything the tests miss**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: clean build, no unresolved imports.

- [ ] **Step 5: Commit**

Since these files were untracked, there is nothing to stage for deletion — they simply won't appear in `git status` any more.

```bash
git status
```

Expected: the two files should no longer be listed as untracked. If by chance they were accidentally committed earlier in the session, stage the deletions with `git rm` first and include in a commit:

```bash
git add -A
git commit -m "Remove unused BirdImagePopup prototype, superseded by AttributionTooltip"
```

Otherwise skip this commit.

---

## Done criteria

- `npm test` passes all suites.
- `npm run lint` clean.
- `npm run build` clean.
- Visual: hovering any thumbnail in Sidebar or Top30Days shows a `© photographer / licence` tooltip above the image within 100 ms of hover, with no native-title delay.
- Visual: large hero images (`LastIdentified`, `RareVisitors`, `BirdProfile`) show the updated, clearly readable corner pill with `© ` prefix.
- `DailyTopBirds` canvas thumbs remain without attribution (documented non-goal).
