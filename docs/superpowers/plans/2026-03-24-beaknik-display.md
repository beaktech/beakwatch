# Beaknik Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a passive full-screen bird detection ambient display (React frontend + Node/Express proxy) that pulls live data from a BirdNET-Go instance over ZeroTier.

**Architecture:** A single Node/Express process on the operator's machine serves the built React app as static files and proxies `/api/*` requests to the configured BirdNET-Go instance. The React app runs three independent polling loops and renders a two-panel layout (70% rotating hero slides, 30% live sidebar) with a persistent stats bar.

**Tech Stack:** Node.js/Express, Vite, React, Tailwind CSS v4, Vitest, React Testing Library, Supertest, date-fns

---

## File Map

| File | Responsibility |
|---|---|
| `server/index.js` | Express app: proxy `/api/*` to BirdNET-Go, serve `dist/` as static |
| `server/.env` | `BIRDNET_GO_URL`, `PORT` env vars |
| `vite.config.js` | Vite config: dev proxy to Express, test config |
| `tailwind.config.js` | Tailwind theme: forest-green/white palette |
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Full-screen two-panel layout shell |
| `src/index.css` | Global styles, Tailwind directives, font |
| `src/utils/wikipedia.js` | Wikipedia summary API fetch, module-level Map cache |
| `src/utils/formatters.js` | `toSlug(commonName)` for photo filenames, `timeAgo(timestamp)` |
| `src/hooks/usePolling.js` | Shared polling utility (setInterval + cleanup) |
| `src/hooks/useDetections.js` | Polls `/api/recent` every 15s |
| `src/hooks/useTodayStats.js` | Polls `/api/today` every 60s |
| `src/hooks/useHistory.js` | Polls `/api/history` every 5 mins |
| `src/components/BirdImage.jsx` | `<img>` with local → Wikipedia → SVG placeholder fallback |
| `src/components/Sidebar.jsx` | "Live from the Canopy" scrolling card list |
| `src/components/StatsBar.jsx` | Persistent bottom strip with four stats |
| `src/components/hero/HeroRotator.jsx` | Slide sequencing, skip logic, crossfade, no-activity gate |
| `src/components/hero/LastIdentified.jsx` | Most recent bird or Species Spotlight variant |
| `src/components/hero/DailyTopBirds.jsx` | 10×24 CSS grid heatmap |
| `src/components/hero/Top30Days.jsx` | Ranked top-10 list |
| `src/components/hero/RareVisitors.jsx` | Bottom-5 all-time species |
| `src/components/hero/NoActivity.jsx` | "Birds are resting" full-screen slide |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `src/main.jsx`
- Create: `src/index.css`
- Create: `src/App.jsx` (skeleton only)
- Create: `server/.env`

- [ ] **Step 1: Initialise the project**

```bash
cd /Users/olic/anomify/dev/beaknik
npm create vite@latest . -- --template react
```

When prompted, confirm overwriting the directory.

- [ ] **Step 2: Install all dependencies**

```bash
npm install express http-proxy-middleware dotenv date-fns
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom supertest @tailwindcss/vite tailwindcss
```

- [ ] **Step 3: Configure Vite**

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Configure Tailwind**

Create `tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#1a3a1a',
          800: '#244d24',
          700: '#2d6a2d',
          600: '#388a38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

- [ ] **Step 6: Replace `src/index.css`**

```css
@import "tailwindcss";

@layer base {
  html, body, #root {
    height: 100%;
    margin: 0;
    background-color: #1a3a1a;
    color: white;
    font-family: Inter, system-ui, sans-serif;
  }
}
```

- [ ] **Step 7: Replace `src/App.jsx` with skeleton**

```jsx
export default function App() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <main className="w-[70%] h-full">Hero</main>
        <aside className="w-[30%] h-full border-l border-forest-700">Sidebar</aside>
      </div>
      <footer className="h-10 border-t border-forest-700 flex items-center px-4 text-sm text-white/70">
        Stats bar
      </footer>
    </div>
  )
}
```

- [ ] **Step 8: Create `server/.env`**

```
BIRDNET_GO_URL=http://10.x.x.x:8080
PORT=3000
```

- [ ] **Step 9: Add scripts to `package.json`**

In the `"scripts"` block, ensure:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "start": "node server/index.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 10: Verify the dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts on port 5173, browser shows "Hero / Sidebar / Stats bar" text.

- [ ] **Step 11: Create `.gitignore`**

Create `.gitignore` at the project root:

```
node_modules/
dist/
server/.env
```

- [ ] **Step 12: Commit**

```bash
git init
git add package.json vite.config.js tailwind.config.js src/ public/ index.html .gitignore
git commit -m "feat: scaffold Vite/React/Express project"
```

---

## Task 2: Express Proxy Server

**Files:**
- Create: `server/index.js`
- Create: `server/index.test.js`

**Note:** Before writing the proxy transform, check BirdNET-Go's actual API response shapes by running:
```bash
curl http://<BIRDNET_GO_URL>/api/v2/detections | jq .
```
The proxy should rename fields so the frontend always receives `{ commonName, scientificName, timestamp, confidence }` per detection. Adjust the `normaliseDetection` function below to match actual field names.

- [ ] **Step 1: Write the failing server tests**

Create `server/index.test.js`:

```js
import request from 'supertest'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the Express app in isolation by mocking the proxy middleware
vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: () => (req, res, next) => {
    if (req.url.startsWith('/api/')) {
      res.json({ proxied: true, url: req.url })
    } else {
      next()
    }
  },
}))

const { default: app } = await import('./index.js')

describe('Express server', () => {
  it('proxies /api/recent to BirdNET-Go', async () => {
    const res = await request(app).get('/api/recent')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })

  it('proxies /api/today to BirdNET-Go', async () => {
    const res = await request(app).get('/api/today')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })

  it('proxies /api/history to BirdNET-Go', async () => {
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run server/index.test.js
```

Expected: FAIL — `server/index.js` does not exist yet.

- [ ] **Step 3: Implement `server/index.js`**

```js
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('.env', import.meta.url).pathname })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const BIRDNET_GO_URL = process.env.BIRDNET_GO_URL || 'http://localhost:8080'
const PORT = process.env.PORT || 3000

// Field normalisation: BirdNET-Go may use different field names.
// Run `curl $BIRDNET_GO_URL/api/v2/detections | jq .[0]` first,
// then update this function to map actual field names to the expected shape.
function normaliseDetection(raw) {
  return {
    commonName: raw.commonName ?? raw.common_name ?? raw.name,
    scientificName: raw.scientificName ?? raw.scientific_name,
    timestamp: raw.timestamp ?? raw.date ?? raw.time,
    confidence: raw.confidence ?? raw.score,
  }
}

app.use(
  '/api',
  createProxyMiddleware({
    target: BIRDNET_GO_URL,
    changeOrigin: true,
    selfHandleResponse: false,
    // If BirdNET-Go field names match the expected shape exactly,
    // remove the on.proxyRes handler below and set selfHandleResponse: false.
    // Otherwise, uncomment and adapt:
    //
    // selfHandleResponse: true,
    // on: {
    //   proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
    //     if (!proxyRes.headers['content-type']?.includes('application/json')) {
    //       return responseBuffer
    //     }
    //     const data = JSON.parse(responseBuffer.toString('utf8'))
    //     const normalised = Array.isArray(data) ? data.map(normaliseDetection) : data
    //     return JSON.stringify(normalised)
    //   }),
    // },
  })
)

app.use(express.static(join(__dirname, '..', 'dist')))

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Beaknik running on http://localhost:${PORT}`))
}

export default app
```

- [ ] **Step 4: Add `"type": "module"` to `package.json`**

In `package.json`, add at the top level:
```json
"type": "module"
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run server/index.test.js
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: add Express proxy server"
```

---

## Task 3: Utility Functions

**Files:**
- Create: `src/utils/formatters.js`
- Create: `src/utils/formatters.test.js`
- Create: `src/utils/wikipedia.js`
- Create: `src/utils/wikipedia.test.js`

### 3a: Formatters

- [ ] **Step 1: Write failing tests for `toSlug` and `timeAgo`**

Create `src/utils/formatters.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { toSlug, timeAgo } from './formatters.js'

describe('toSlug', () => {
  it('lowercases and hyphenates common names', () => {
    expect(toSlug('Eurasian Wren')).toBe('eurasian-wren')
  })

  it("strips apostrophes (e.g. Cetti's Warbler)", () => {
    expect(toSlug("Cetti's Warbler")).toBe('cettis-warbler')
  })

  it('strips other non-alphanumeric characters', () => {
    expect(toSlug('Black-and-white Warbler')).toBe('black-and-white-warbler')
  })

  it('collapses multiple hyphens', () => {
    expect(toSlug('Robin  (European)')).toBe('robin-european')
  })
})

describe('timeAgo', () => {
  it('returns "just now" for timestamps under 60 seconds ago', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 30_000).toISOString()
    expect(timeAgo(ts)).toBe('just now')
  })

  it('returns "2 mins ago" for a 2-minute-old timestamp', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 2 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('2 mins ago')
  })

  it('returns "1 hr ago" for a 1-hour-old timestamp', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 60 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('1 hr ago')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/utils/formatters.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/formatters.js`**

```js
export function toSlug(commonName) {
  return commonName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (incl apostrophes)
    .trim()
    .replace(/[\s-]+/g, '-')         // spaces and hyphens → single hyphen
}

export function timeAgo(isoTimestamp) {
  const seconds = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/utils/formatters.test.js
```

Expected: 7 passing.

### 3b: Wikipedia utility

- [ ] **Step 5: Write failing tests for `src/utils/wikipedia.js`**

Create `src/utils/wikipedia.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Clear module cache between tests so the module-level Map is fresh
beforeEach(() => {
  vi.resetModules()
})

describe('fetchWikipedia', () => {
  it('returns photo and extract from Wikipedia summary API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: 'The Eurasian wren is a tiny bird.',
        thumbnail: { source: 'https://example.com/wren.jpg' },
      }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Eurasian Wren')

    expect(result).toEqual({
      extract: 'The Eurasian wren is a tiny bird.',
      photoUrl: 'https://example.com/wren.jpg',
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Eurasian%20Wren'
    )
  })

  it('returns null photoUrl when thumbnail is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'Some bird.', thumbnail: undefined }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Unknown Bird')

    expect(result.photoUrl).toBeNull()
    expect(result.extract).toBe('Some bird.')
  })

  it('caches results and only fetches once for the same species', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'A bird.', thumbnail: { source: 'http://x.com/img.jpg' } }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    await fetchWikipedia('Robin')
    await fetchWikipedia('Robin')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null values when Wikipedia returns a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Nonexistent Bird')

    expect(result).toEqual({ extract: null, photoUrl: null })
  })
})
```

- [ ] **Step 6: Run tests — expect failure**

```bash
npx vitest run src/utils/wikipedia.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement `src/utils/wikipedia.js`**

```js
const cache = new Map()

export async function fetchWikipedia(commonName) {
  if (cache.has(commonName)) {
    return cache.get(commonName)  // may be a Promise (in-flight) or resolved value
  }

  const promise = (async () => {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName)}`
      const res = await fetch(url)
      if (!res.ok) return { extract: null, photoUrl: null }
      const data = await res.json()
      return {
        extract: data.extract ?? null,
        photoUrl: data.thumbnail?.source ?? null,
      }
    } catch {
      return { extract: null, photoUrl: null }
    }
  })()

  cache.set(commonName, promise)
  const result = await promise
  cache.set(commonName, result)  // replace Promise with resolved value
  return result
}
```

- [ ] **Step 8: Run tests — expect pass**

```bash
npx vitest run src/utils/wikipedia.test.js
```

Expected: 4 passing.

- [ ] **Step 9: Commit**

```bash
git add src/utils/
git commit -m "feat: add formatters and Wikipedia cache utility"
```

---

## Task 4: Polling Hooks

**Files:**
- Create: `src/hooks/usePolling.js`
- Create: `src/hooks/useDetections.js`
- Create: `src/hooks/useTodayStats.js`
- Create: `src/hooks/useHistory.js`
- Create: `src/hooks/usePolling.test.js`
- Create: `src/hooks/useDetections.test.js`

- [ ] **Step 1: Write failing tests for `usePolling`**

Create `src/hooks/usePolling.test.js`:

```js
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePolling } from './usePolling.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('usePolling', () => {
  it('calls fetchFn immediately on mount', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 1 })
    renderHook(() => usePolling(fetchFn, 5000))
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('calls fetchFn again after the interval', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 1 })
    renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('returns the last successful data', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ birds: ['wren'] })
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    expect(result.current.data).toEqual({ birds: ['wren'] })
  })

  it('keeps previous data when a fetch fails', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ birds: ['wren'] })
      .mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(result.current.data).toEqual({ birds: ['wren'] })
  })

  it('exposes lastSuccessAt timestamp updated on each successful fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({})
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    const first = result.current.lastSuccessAt
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(result.current.lastSuccessAt).toBeGreaterThanOrEqual(first)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/hooks/usePolling.test.js
```

- [ ] **Step 3: Implement `src/hooks/usePolling.js`**

```js
import { useState, useEffect, useRef, useCallback } from 'react'

export function usePolling(fetchFn, intervalMs) {
  const [data, setData] = useState(null)
  const [lastSuccessAt, setLastSuccessAt] = useState(0)
  const dataRef = useRef(null)

  const run = useCallback(async () => {
    try {
      const result = await fetchFn()
      dataRef.current = result
      setData(result)
      setLastSuccessAt(Date.now())
    } catch {
      // keep previous data, do not update lastSuccessAt
    }
  }, [fetchFn])

  useEffect(() => {
    run()
    const id = setInterval(run, intervalMs)
    return () => clearInterval(id)
  }, [run, intervalMs])

  return { data, lastSuccessAt }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/hooks/usePolling.test.js
```

Expected: 5 passing.

- [ ] **Step 5: Write failing test for `useDetections`**

Create `src/hooks/useDetections.test.js`:

```js
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { commonName: 'Eurasian Wren', scientificName: 'Troglodytes troglodytes', timestamp: '2026-03-24T10:00:00Z', confidence: 0.9 },
    ],
  })
})
afterEach(() => { vi.useRealTimers() })

describe('useDetections', () => {
  it('fetches /api/recent and returns detections', async () => {
    const { useDetections } = await import('./useDetections.js')
    const { result } = renderHook(() => useDetections())
    await act(async () => {})
    expect(result.current.detections).toHaveLength(1)
    expect(result.current.detections[0].commonName).toBe('Eurasian Wren')
  })

  it('polls /api/recent every 15 seconds', async () => {
    const { useDetections } = await import('./useDetections.js')
    renderHook(() => useDetections())
    await act(async () => {})
    await act(async () => { vi.advanceTimersByTime(15_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 6: Run tests — expect failure**

```bash
npx vitest run src/hooks/useDetections.test.js
```

- [ ] **Step 7: Implement the three polling hooks**

Create `src/hooks/useDetections.js`:

```js
import { useCallback } from 'react'
import { usePolling } from './usePolling.js'

async function fetchRecent() {
  const res = await fetch('/api/recent')
  if (!res.ok) throw new Error('Failed to fetch recent detections')
  return res.json()
}

export function useDetections() {
  const { data, lastSuccessAt } = usePolling(useCallback(fetchRecent, []), 15_000)
  return { detections: data ?? [], lastSuccessAt }
}
```

Create `src/hooks/useTodayStats.js`:

```js
import { useCallback } from 'react'
import { usePolling } from './usePolling.js'

async function fetchToday() {
  const res = await fetch('/api/today')
  if (!res.ok) throw new Error('Failed to fetch today stats')
  return res.json()
}

export function useTodayStats() {
  const { data } = usePolling(useCallback(fetchToday, []), 60_000)
  return { todayStats: data ?? [] }
}
```

Create `src/hooks/useHistory.js`:

```js
import { useCallback } from 'react'
import { usePolling } from './usePolling.js'

async function fetchHistory() {
  const res = await fetch('/api/history')
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export function useHistory() {
  const { data } = usePolling(useCallback(fetchHistory, []), 5 * 60_000)
  return { history: data ?? null }
}
```

- [ ] **Step 8: Run all hook tests — expect pass**

```bash
npx vitest run src/hooks/
```

Expected: all passing.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/
git commit -m "feat: add polling hooks for BirdNET-Go API"
```

---

## Task 5: BirdImage Component

**Files:**
- Create: `src/components/BirdImage.jsx`
- Create: `src/components/BirdImage.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/BirdImage.test.jsx`:

```jsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn(),
}))

import { fetchWikipedia } from '../utils/wikipedia.js'
import BirdImage from './BirdImage.jsx'

describe('BirdImage', () => {
  beforeEach(() => {
    fetchWikipedia.mockResolvedValue({ photoUrl: 'https://example.com/wiki-wren.jpg', extract: null })
  })

  it('renders a local image src by default', async () => {
    await act(async () => {
      render(<BirdImage commonName="Eurasian Wren" alt="Eurasian Wren" />)
    })
    const img = screen.getByRole('img')
    expect(img.src).toContain('/birds/eurasian-wren')
  })

  it('falls back to Wikipedia photo on local image error', async () => {
    await act(async () => {
      render(<BirdImage commonName="Eurasian Wren" alt="Eurasian Wren" />)
    })
    const img = screen.getByRole('img')
    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(img.src).toBe('https://example.com/wiki-wren.jpg')
  })

  it('shows placeholder when Wikipedia returns no photo', async () => {
    fetchWikipedia.mockResolvedValue({ photoUrl: null, extract: null })
    await act(async () => {
      render(<BirdImage commonName="Unknown Bird" alt="Unknown Bird" />)
    })
    const img = screen.getByRole('img')
    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(img.src).toContain('placeholder')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/components/BirdImage.test.jsx
```

- [ ] **Step 3: Implement `src/components/BirdImage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { toSlug } from '../utils/formatters.js'
import { fetchWikipedia } from '../utils/wikipedia.js'

const PLACEHOLDER = '/birds/placeholder.svg'
const EXTENSIONS = ['.jpg', '.png', '.webp']

export default function BirdImage({ commonName, alt, className = '' }) {
  const [wikiData, setWikiData] = useState(null)
  const [srcIndex, setSrcIndex] = useState(0)
  const [usedWiki, setUsedWiki] = useState(false)

  const slug = toSlug(commonName)
  const localSrcs = EXTENSIONS.map(ext => `/birds/${slug}${ext}`)

  // Eagerly fetch Wikipedia data on mount
  useEffect(() => {
    fetchWikipedia(commonName).then(setWikiData)
  }, [commonName])

  function handleError() {
    if (srcIndex < localSrcs.length - 1) {
      // Try next local extension
      setSrcIndex(i => i + 1)
    } else if (!usedWiki && wikiData?.photoUrl) {
      setUsedWiki(true)
    } else {
      // All failed — use placeholder
      setUsedWiki(true)
    }
  }

  const src = usedWiki
    ? (wikiData?.photoUrl ?? PLACEHOLDER)
    : localSrcs[srcIndex]

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}
```

- [ ] **Step 4: Create a placeholder SVG**

Create `public/birds/placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" fill="#244d24"/>
  <text x="50" y="60" text-anchor="middle" font-size="40" fill="white">🪶</text>
</svg>
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/components/BirdImage.test.jsx
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add src/components/BirdImage.jsx src/components/BirdImage.test.jsx public/birds/placeholder.svg
git commit -m "feat: add BirdImage with local/Wikipedia/placeholder fallback"
```

---

## Task 6: Sidebar

**Files:**
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/Sidebar.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/Sidebar.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('./BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))

import Sidebar from './Sidebar.jsx'

const detections = [
  { commonName: 'Eurasian Wren', timestamp: new Date(Date.now() - 120_000).toISOString(), confidence: 0.9 },
  { commonName: 'Robin', timestamp: new Date(Date.now() - 300_000).toISOString(), confidence: 0.8 },
]

describe('Sidebar', () => {
  it('renders "Live from the Canopy" heading', () => {
    render(<Sidebar detections={detections} />)
    expect(screen.getByText('Live from the Canopy')).toBeInTheDocument()
  })

  it('renders a card for each detection', () => {
    render(<Sidebar detections={detections} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('Robin')).toBeInTheDocument()
  })

  it('shows relative timestamp on each card', () => {
    render(<Sidebar detections={detections} />)
    expect(screen.getByText('2 mins ago')).toBeInTheDocument()
  })

  it('renders LIVE indicator', () => {
    render(<Sidebar detections={detections} />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/components/Sidebar.test.jsx
```

- [ ] **Step 3: Implement `src/components/Sidebar.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import BirdImage from './BirdImage.jsx'
import { timeAgo } from '../utils/formatters.js'

export default function Sidebar({ detections }) {
  const listRef = useRef(null)
  const prevTopTimestamp = useRef(null)

  // Scroll to top when a new detection arrives
  useEffect(() => {
    const latest = detections[0]?.timestamp
    if (latest && latest !== prevTopTimestamp.current) {
      prevTopTimestamp.current = latest
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [detections])

  return (
    <div className="flex flex-col h-full bg-forest-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-forest-700 flex-shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-xs font-bold tracking-widest text-red-400">LIVE</span>
        <span className="text-sm font-semibold text-white ml-1">Live from the Canopy</span>
      </div>

      {/* Cards */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {detections.map((d, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-forest-800">
            <BirdImage
              commonName={d.commonName}
              alt={d.commonName}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{d.commonName}</p>
              <p className="text-xs text-white/50">{timeAgo(d.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/components/Sidebar.test.jsx
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.test.jsx
git commit -m "feat: add Sidebar live feed component"
```

---

## Task 7: StatsBar

**Files:**
- Create: `src/components/StatsBar.jsx`
- Create: `src/components/StatsBar.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/StatsBar.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatsBar from './StatsBar.jsx'

const todayStats = [
  { commonName: 'Wren' },
  { commonName: 'Robin' },
  { commonName: 'Wren' }, // duplicate species, same day
]

const history = {
  speciesLast30Days: 50,
  speciesAllTime: 124,
  newThisWeek: 3,
}

describe('StatsBar', () => {
  it('shows count of distinct species today', () => {
    render(<StatsBar todayStats={todayStats} history={history} />)
    expect(screen.getByText(/2 species today/)).toBeInTheDocument()
  })

  it('shows last-30-day species count from history', () => {
    render(<StatsBar todayStats={todayStats} history={history} />)
    expect(screen.getByText(/50 in last 30 days/)).toBeInTheDocument()
  })

  it('shows all-time species count', () => {
    render(<StatsBar todayStats={todayStats} history={history} />)
    expect(screen.getByText(/124 ever/)).toBeInTheDocument()
  })

  it('shows new-this-week count', () => {
    render(<StatsBar todayStats={todayStats} history={history} />)
    expect(screen.getByText(/3 new this week/)).toBeInTheDocument()
  })

  it('renders dashes when data is not yet loaded', () => {
    render(<StatsBar todayStats={[]} history={null} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/components/StatsBar.test.jsx
```

- [ ] **Step 3: Implement `src/components/StatsBar.jsx`**

```jsx
export default function StatsBar({ todayStats, history }) {
  const speciesCount = new Set(todayStats.map(d => d.commonName)).size

  const stats = [
    { label: 'species today', value: speciesCount || '—' },
    { label: 'in last 30 days', value: history?.speciesLast30Days ?? '—' },
    { label: 'ever', value: history?.speciesAllTime ?? '—' },
    { label: 'new this week', value: history?.newThisWeek ?? '—' },
  ]

  return (
    <footer className="h-10 border-t border-forest-700 flex items-center justify-center gap-6 px-6 text-sm text-white/60">
      {stats.map(({ label, value }, i) => (
        <span key={label}>
          {i > 0 && <span className="mr-6 text-white/20">·</span>}
          <span className="text-white font-semibold">{value}</span>{' '}
          {label}
        </span>
      ))}
    </footer>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/components/StatsBar.test.jsx
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsBar.jsx src/components/StatsBar.test.jsx
git commit -m "feat: add StatsBar persistent stats strip"
```

---

## Task 8: Hero Slides

**Files:**
- Create: `src/components/hero/NoActivity.jsx`
- Create: `src/components/hero/LastIdentified.jsx`
- Create: `src/components/hero/LastIdentified.test.jsx`
- Create: `src/components/hero/DailyTopBirds.jsx`
- Create: `src/components/hero/DailyTopBirds.test.jsx`
- Create: `src/components/hero/Top30Days.jsx`
- Create: `src/components/hero/Top30Days.test.jsx`
- Create: `src/components/hero/RareVisitors.jsx`
- Create: `src/components/hero/RareVisitors.test.jsx`

### 8a: NoActivity (no logic to test, implement directly)

- [ ] **Step 1: Implement `src/components/hero/NoActivity.jsx`**

```jsx
export default function NoActivity() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-forest-900 text-white/70 text-center px-12">
      <span className="text-7xl mb-6">🌙</span>
      <p className="text-3xl font-light">The birds are resting...</p>
      <p className="text-xl mt-3 text-white/40">Check back at dusk!</p>
    </div>
  )
}
```

### 8b: LastIdentified

- [ ] **Step 2: Write failing tests for LastIdentified**

Create `src/components/hero/LastIdentified.test.jsx`:

```jsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../../utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue({
    extract: 'A tiny brown bird.',
    photoUrl: null,
  }),
}))

import LastIdentified from './LastIdentified.jsx'

const detection = {
  commonName: 'Eurasian Wren',
  scientificName: 'Troglodytes troglodytes',
  timestamp: new Date().toISOString(),
}

describe('LastIdentified', () => {
  it('shows the common name of the most recent detection', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={false} todayCount={null} />)
    })
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
  })

  it('shows the Wikipedia fun fact', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={false} todayCount={null} />)
    })
    expect(screen.getByText('A tiny brown bird.')).toBeInTheDocument()
  })

  it('shows Species Spotlight variant when isSpotlight is true', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={true} todayCount={42} />)
    })
    expect(screen.getByText('Species Spotlight')).toBeInTheDocument()
    expect(screen.getByText(/42 detections today/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npx vitest run src/components/hero/LastIdentified.test.jsx
```

- [ ] **Step 4: Implement `src/components/hero/LastIdentified.jsx`**

```jsx
import { useState, useEffect } from 'react'
import BirdImage from '../BirdImage.jsx'
import { fetchWikipedia } from '../../utils/wikipedia.js'

export default function LastIdentified({ detection, isSpotlight, todayCount }) {
  const [extract, setExtract] = useState(null)

  useEffect(() => {
    if (detection) {
      fetchWikipedia(detection.commonName).then(d => setExtract(d.extract))
    }
  }, [detection?.commonName])

  if (!detection) return null

  return (
    <div className="relative h-full flex flex-col">
      <BirdImage
        commonName={detection.commonName}
        alt={detection.commonName}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/40 to-transparent" />

      {/* Content */}
      <div className="relative mt-auto p-8">
        {isSpotlight && (
          <p className="text-forest-600 text-sm font-bold tracking-widest uppercase mb-2">
            Species Spotlight
          </p>
        )}
        <h2 className="text-5xl font-bold text-white">{detection.commonName}</h2>
        {isSpotlight && todayCount != null && (
          <p className="text-2xl text-white/70 mt-2">{todayCount} detections today</p>
        )}
        {!isSpotlight && extract && (
          <p className="text-lg text-white/70 mt-3 max-w-xl leading-relaxed">{extract}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/components/hero/LastIdentified.test.jsx
```

Expected: 3 passing.

### 8c: DailyTopBirds (heatmap)

**Note on `/api/today` response shape:** Before implementing, confirm whether BirdNET-Go's `/api/today` response includes an `hour` field per detection (or equivalent time-of-day data). The component groups detections by hour to build the heatmap. If the raw response contains full timestamps rather than a pre-grouped structure, the `DailyTopBirds` component will need to extract the hour from the timestamp: `new Date(d.timestamp).getHours()`. Adjust the `todayStats` prop shape and internal grouping logic accordingly.

- [ ] **Step 6: Write failing tests for DailyTopBirds**

Create `src/components/hero/DailyTopBirds.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DailyTopBirds from './DailyTopBirds.jsx'

// todayStats: array of { commonName, hour (0-23), count }
const todayStats = [
  { commonName: 'Eurasian Wren', hour: 8, count: 5 },
  { commonName: 'Eurasian Wren', hour: 9, count: 10 },
  { commonName: 'Robin', hour: 7, count: 3 },
]

describe('DailyTopBirds', () => {
  it('renders species names', () => {
    render(<DailyTopBirds todayStats={todayStats} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('Robin')).toBeInTheDocument()
  })

  it('renders a heading', () => {
    render(<DailyTopBirds todayStats={todayStats} />)
    expect(screen.getByText(/Most Active Today/i)).toBeInTheDocument()
  })

  it('renders 24 hour columns per species', () => {
    render(<DailyTopBirds todayStats={todayStats} />)
    // Each species row has 24 cells. With 2 species = 48 cells total
    const cells = document.querySelectorAll('[data-cell]')
    expect(cells.length).toBe(48)
  })
})
```

- [ ] **Step 7: Run tests — expect failure**

```bash
npx vitest run src/components/hero/DailyTopBirds.test.jsx
```

- [ ] **Step 8: Implement `src/components/hero/DailyTopBirds.jsx`**

```jsx
// todayStats prop: array of { commonName, hour, count } (from /api/today after grouping)
export default function DailyTopBirds({ todayStats }) {
  // Group by species: { [commonName]: { [hour]: count } }
  const bySpecies = {}
  for (const d of todayStats) {
    if (!bySpecies[d.commonName]) bySpecies[d.commonName] = {}
    bySpecies[d.commonName][d.hour] = (bySpecies[d.commonName][d.hour] ?? 0) + d.count
  }

  // Top 10 by total count
  const top10 = Object.entries(bySpecies)
    .map(([name, hours]) => ({ name, hours, total: Object.values(hours).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return (
    <div className="h-full flex flex-col p-8 bg-forest-900">
      <h2 className="text-2xl font-bold text-white mb-6">Most Active Today</h2>
      <div className="flex-1 overflow-hidden">
        {top10.map(({ name, hours }) => {
          const max = Math.max(1, ...Object.values(hours))
          return (
            <div key={name} className="flex items-center mb-2 gap-3">
              <span className="text-sm text-white/70 w-36 truncate flex-shrink-0">{name}</span>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const count = hours[h] ?? 0
                  const opacity = count / max
                  return (
                    <div
                      key={h}
                      data-cell
                      className="flex-1 h-6 rounded-sm"
                      style={{ backgroundColor: `rgba(56, 138, 56, ${opacity})`, minWidth: 0 }}
                      title={`${h}:00 — ${count} detections`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* Hour labels */}
        <div className="flex gap-0.5 mt-1 ml-[156px]">
          {[0, 6, 12, 18].map(h => (
            <span
              key={h}
              className="text-xs text-white/30 flex-1"
              style={{ marginLeft: h === 0 ? 0 : undefined }}
            >
              {h}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Run tests — expect pass**

```bash
npx vitest run src/components/hero/DailyTopBirds.test.jsx
```

### 8d: Top30Days

- [ ] **Step 10: Write failing test for Top30Days**

Create `src/components/hero/Top30Days.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Top30Days from './Top30Days.jsx'

const species = [
  { commonName: 'Eurasian Wren', count: 200 },
  { commonName: 'Robin', count: 150 },
]

describe('Top30Days', () => {
  it('renders heading', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText(/Top Birds/i)).toBeInTheDocument()
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

- [ ] **Step 11: Run tests — expect failure**

```bash
npx vitest run src/components/hero/Top30Days.test.jsx
```

- [ ] **Step 12: Implement `src/components/hero/Top30Days.jsx`**

```jsx
export default function Top30Days({ species }) {
  return (
    <div className="h-full flex flex-col p-8 bg-forest-900">
      <h2 className="text-2xl font-bold text-white mb-2">Top Birds</h2>
      <p className="text-white/40 text-sm mb-6">Last 30 days</p>
      <div className="space-y-3">
        {species.slice(0, 10).map((s, i) => (
          <div key={s.commonName} className="flex items-center gap-4">
            <span className="text-forest-600 font-bold w-6 text-right">{i + 1}</span>
            <span className="text-white flex-1 text-lg">{s.commonName}</span>
            <span className="text-white/50 text-sm tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 13: Run tests — expect pass**

```bash
npx vitest run src/components/hero/Top30Days.test.jsx
```

### 8e: RareVisitors

- [ ] **Step 14: Write failing test for RareVisitors**

Create `src/components/hero/RareVisitors.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RareVisitors from './RareVisitors.jsx'

const species = [
  { commonName: 'Hawfinch', allTimeCount: 1 },
  { commonName: 'Firecrest', allTimeCount: 2 },
]

describe('RareVisitors', () => {
  it('renders heading', () => {
    render(<RareVisitors species={species} />)
    expect(screen.getByText(/Rare Visitors/i)).toBeInTheDocument()
  })

  it('renders rare species with their counts', () => {
    render(<RareVisitors species={species} />)
    expect(screen.getByText('Hawfinch')).toBeInTheDocument()
    expect(screen.getByText('1 detection')).toBeInTheDocument()
  })
})
```

- [ ] **Step 15: Run tests — expect failure**

```bash
npx vitest run src/components/hero/RareVisitors.test.jsx
```

- [ ] **Step 16: Implement `src/components/hero/RareVisitors.jsx`**

```jsx
import BirdImage from '../BirdImage.jsx'

export default function RareVisitors({ species }) {
  return (
    <div className="h-full flex flex-col p-8 bg-forest-900">
      <h2 className="text-2xl font-bold text-white mb-2">Rare Visitors</h2>
      <p className="text-white/40 text-sm mb-6">Least frequently seen at this sanctuary</p>
      <div className="grid grid-cols-1 gap-4">
        {species.slice(0, 5).map(s => (
          <div key={s.commonName} className="flex items-center gap-4">
            <BirdImage
              commonName={s.commonName}
              alt={s.commonName}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div>
              <p className="text-white font-semibold text-lg">{s.commonName}</p>
              <p className="text-white/40 text-sm">
                {s.allTimeCount} {s.allTimeCount === 1 ? 'detection' : 'detections'} ever
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 17: Run all hero slide tests — expect pass**

```bash
npx vitest run src/components/hero/
```

Expected: all passing.

- [ ] **Step 18: Commit**

```bash
git add src/components/hero/
git commit -m "feat: add hero slides (NoActivity, LastIdentified, DailyTopBirds, Top30Days, RareVisitors)"
```

---

## Task 9: HeroRotator

**Files:**
- Create: `src/components/hero/HeroRotator.jsx`
- Create: `src/components/hero/HeroRotator.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/hero/HeroRotator.test.jsx`:

```jsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HeroRotator from './HeroRotator.jsx'

// Stub all slide components
vi.mock('./LastIdentified.jsx', () => ({ default: () => <div>LastIdentified</div> }))
vi.mock('./DailyTopBirds.jsx', () => ({ default: () => <div>DailyTopBirds</div> }))
vi.mock('./Top30Days.jsx', () => ({ default: () => <div>Top30Days</div> }))
vi.mock('./RareVisitors.jsx', () => ({ default: () => <div>RareVisitors</div> }))
vi.mock('./NoActivity.jsx', () => ({ default: () => <div>NoActivity</div> }))

const recentWithActivity = [
  { commonName: 'Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
  { commonName: 'Robin', timestamp: new Date(Date.now() - 60_000).toISOString(), confidence: 0.8 },
]

const props = {
  detections: recentWithActivity,
  todayStats: [{ commonName: 'Wren', hour: 8, count: 5 }],
  history: { top30Days: [{ commonName: 'Wren', count: 100 }], rareVisitors: [{ commonName: 'Hawfinch', allTimeCount: 1 }] },
  lastSuccessAt: Date.now(),
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('HeroRotator', () => {
  it('starts on the LastIdentified slide', () => {
    render(<HeroRotator {...props} />)
    expect(screen.getByText('LastIdentified')).toBeInTheDocument()
  })

  it('advances to the next slide after 15 seconds', () => {
    render(<HeroRotator {...props} />)
    act(() => { vi.advanceTimersByTime(15_000) })
    expect(screen.getByText('DailyTopBirds')).toBeInTheDocument()
  })

  it('shows NoActivity when no detections in last 30 minutes', () => {
    const staleDetections = [
      { commonName: 'Wren', timestamp: new Date(Date.now() - 31 * 60_000).toISOString(), confidence: 0.9 },
    ]
    render(<HeroRotator {...props} detections={staleDetections} />)
    expect(screen.getByText('NoActivity')).toBeInTheDocument()
  })

  it('shows NoActivity when lastSuccessAt is stale by more than 5 minutes', () => {
    render(<HeroRotator {...props} lastSuccessAt={Date.now() - 6 * 60_000} />)
    expect(screen.getByText('NoActivity')).toBeInTheDocument()
  })

  it('shows Species Spotlight when top 2 detections are the same species', () => {
    const sameSpecies = [
      { commonName: 'Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
      { commonName: 'Wren', timestamp: new Date(Date.now() - 5_000).toISOString(), confidence: 0.8 },
    ]
    render(<HeroRotator {...props} detections={sameSpecies} />)
    // LastIdentified should receive isSpotlight=true — we check it rendered
    expect(screen.getByText('LastIdentified')).toBeInTheDocument()
  })

  it('skips Top30Days slide when history has no 30-day data', () => {
    render(<HeroRotator {...props} history={{ ...props.history, top30Days: [] }} />)
    act(() => { vi.advanceTimersByTime(15_000) })
    // Should skip from DailyTopBirds straight to RareVisitors
    act(() => { vi.advanceTimersByTime(15_000) })
    expect(screen.getByText('RareVisitors')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/components/hero/HeroRotator.test.jsx
```

- [ ] **Step 3: Implement `src/components/hero/HeroRotator.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react'
import LastIdentified from './LastIdentified.jsx'
import DailyTopBirds from './DailyTopBirds.jsx'
import Top30Days from './Top30Days.jsx'
import RareVisitors from './RareVisitors.jsx'
import NoActivity from './NoActivity.jsx'

const SLIDE_INTERVAL = 15_000
const NO_ACTIVITY_WINDOW = 30 * 60_000
const STALE_THRESHOLD = 5 * 60_000

function isNoActivity(detections, lastSuccessAt) {
  if (Date.now() - lastSuccessAt > STALE_THRESHOLD) return true
  if (detections.length === 0) return true
  const latest = new Date(detections[0].timestamp).getTime()
  return Date.now() - latest > NO_ACTIVITY_WINDOW
}

export default function HeroRotator({ detections, todayStats, history, lastSuccessAt }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const inactive = isNoActivity(detections, lastSuccessAt)
  const isSpotlight =
    detections.length >= 2 &&
    detections[0].commonName === detections[1].commonName

  // Build available slides (skip slides with no data)
  const slides = [
    { key: 'last', hasData: detections.length > 0 },
    { key: 'today', hasData: todayStats.length > 0 },
    { key: 'top30', hasData: (history?.top30Days?.length ?? 0) > 0 },
    { key: 'rare', hasData: (history?.rareVisitors?.length ?? 0) > 0 },
  ].filter(s => s.hasData).map(s => s.key)

  const availableRef = useRef(slides)
  availableRef.current = slides

  useEffect(() => {
    if (inactive) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setSlideIndex(i => (i + 1) % (availableRef.current.length || 1))
        setVisible(true)
      }, 500) // match crossfade duration
    }, SLIDE_INTERVAL)
    return () => clearInterval(id)
  }, [inactive])

  if (inactive || slides.length === 0) return <NoActivity />

  const currentSlide = slides[slideIndex % slides.length]
  const todayCount = todayStats.filter(d => d.commonName === detections[0]?.commonName)
    .reduce((sum, d) => sum + d.count, 0)

  return (
    <div
      className="h-full transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {currentSlide === 'last' && (
        <LastIdentified
          detection={detections[0]}
          isSpotlight={isSpotlight}
          todayCount={todayCount}
        />
      )}
      {currentSlide === 'today' && <DailyTopBirds todayStats={todayStats} />}
      {currentSlide === 'top30' && <Top30Days species={history.top30Days} />}
      {currentSlide === 'rare' && <RareVisitors species={history.rareVisitors} />}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/components/hero/HeroRotator.test.jsx
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/HeroRotator.jsx src/components/hero/HeroRotator.test.jsx
git commit -m "feat: add HeroRotator with slide sequencing and no-activity logic"
```

---

## Task 10: Wire Everything Together

**Files:**
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`

- [ ] **Step 1: Write integration smoke test**

Create `src/App.test.jsx`:

```jsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('./hooks/useDetections.js', () => ({
  useDetections: () => ({
    detections: [
      { commonName: 'Eurasian Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
      { commonName: 'Robin', timestamp: new Date().toISOString(), confidence: 0.8 },
    ],
    lastSuccessAt: Date.now(),
  }),
}))
vi.mock('./hooks/useTodayStats.js', () => ({
  useTodayStats: () => ({ todayStats: [{ commonName: 'Eurasian Wren', hour: 8, count: 5 }] }),
}))
vi.mock('./hooks/useHistory.js', () => ({
  useHistory: () => ({
    history: {
      top30Days: [{ commonName: 'Eurasian Wren', count: 100 }],
      rareVisitors: [{ commonName: 'Hawfinch', allTimeCount: 1 }],
      speciesLast30Days: 50,
      speciesAllTime: 124,
      newThisWeek: 3,
    },
  }),
}))
vi.mock('./utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue({ extract: 'A tiny bird.', photoUrl: null }),
}))

import App from './App.jsx'

describe('App', () => {
  it('renders the sidebar', async () => {
    await act(async () => { render(<App />) })
    expect(screen.getByText('Live from the Canopy')).toBeInTheDocument()
  })

  it('renders the stats bar', async () => {
    await act(async () => { render(<App />) })
    expect(screen.getByText(/species today/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/App.test.jsx
```

- [ ] **Step 3: Implement full `src/App.jsx`**

```jsx
import { useDetections } from './hooks/useDetections.js'
import { useTodayStats } from './hooks/useTodayStats.js'
import { useHistory } from './hooks/useHistory.js'
import Sidebar from './components/Sidebar.jsx'
import StatsBar from './components/StatsBar.jsx'
import HeroRotator from './components/hero/HeroRotator.jsx'

export default function App() {
  const { detections, lastSuccessAt } = useDetections()
  const { todayStats } = useTodayStats()
  const { history } = useHistory()

  return (
    <div className="flex flex-col h-full bg-forest-900">
      <div className="flex flex-1 overflow-hidden">
        <main className="w-[70%] h-full overflow-hidden">
          <HeroRotator
            detections={detections}
            todayStats={todayStats}
            history={history}
            lastSuccessAt={lastSuccessAt}
          />
        </main>
        <aside className="w-[30%] h-full border-l border-forest-700 overflow-hidden">
          <Sidebar detections={detections} />
        </aside>
      </div>
      <StatsBar todayStats={todayStats} history={history} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/App.test.jsx
```

Expected: 2 passing.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests passing.

- [ ] **Step 6: Build and verify production bundle**

```bash
npm run build
```

Expected: `dist/` created with no errors.

- [ ] **Step 7: Start the server and open in browser**

```bash
npm start
```

Open `http://localhost:3000` in a browser. Verify the layout renders: sidebar on the right, hero on the left, stats bar at bottom.

**Important:** At this point, the app will make real API calls to BirdNET-Go. Confirm the BirdNET-Go API response shapes match the proxy's expected normalisation. If fields are named differently (e.g. `common_name` instead of `commonName`), update the proxy transform in `server/index.js` accordingly.

- [ ] **Step 8: Final commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: wire App layout with all hooks and components"
```

---

## Verification Checklist

Before declaring the build complete:

- [ ] All tests pass: `npx vitest run`
- [ ] Production build succeeds: `npm run build`
- [ ] Server starts: `npm start`
- [ ] Layout renders correctly on a browser (hero 70%, sidebar 30%, stats bar)
- [ ] Sidebar shows "LIVE" indicator and detection cards
- [ ] Hero rotates between slides every 15 seconds
- [ ] No Activity slide appears when BirdNET-Go has no recent detections
- [ ] Bird photos load (or fall back to Wikipedia / placeholder)
- [ ] Switching `BIRDNET_GO_URL` in `.env` and restarting changes the data source
