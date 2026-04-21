# Beaknik — Bird Detection Display: Design Spec

**Date:** 2026-03-24

## Overview

A passive ambient display for a nature sanctuary. Shows live bird detection data from a BirdNET-Go monitor running on a Raspberry Pi 5. Designed to run full-screen on an iPad or large screen, answering three visitor questions:

1. What birds are here right now?
2. What birds have been active today?
3. What interesting species visit this place?

No user interaction. No audio playback or spectrograms in this version.

---

## Architecture

**Single deployable unit** — a Node.js/Express app running on the operator's machine (home machine or server). It:

- Proxies API requests to whichever BirdNET-Go instance is configured
- Serves the built React frontend as static files

```
BirdNET-Go (Raspberry Pi 5, ZeroTier IP)
        ↓  ZeroTier network
Operator's machine:
  └── Node/Express (server/index.js)
        ├── /api/*  → proxies to BIRDNET_GO_URL
        └── /*      → serves built React app

iPad / screen → operator's machine (local network, port 3000)
```

**Switching monitors:** Change the `BIRDNET_GO_URL` environment variable and restart (`npm start`). No other changes needed.

**Environment:** The server reads `server/.env` via `dotenv`. Key variable: `BIRDNET_GO_URL=http://10.x.x.x:8080`.

**Proxy behaviour:** The proxy passes BirdNET-Go responses through to the client. If BirdNET-Go's field names differ from what the frontend expects, the proxy applies a minimal normalisation transform (rename fields only — no business logic). The frontend expects each detection to expose at minimum: `commonName`, `scientificName`, `timestamp` (ISO 8601), `confidence` (0–1 float). The exact BirdNET-Go API response shape should be confirmed during implementation, and the proxy transform written accordingly.

---

## Frontend Layout

Full-screen, no scrolling of the overall page. Two-panel layout:

```
┌─────────────────────────────┬──────────────┐
│                             │  LIVE FEED   │
│        HERO (70%)           │   (30%)      │
│                             │              │
│   [rotating slides]         │  [cards]     │
│                             │              │
├─────────────────────────────┴──────────────┤
│  Stats bar (full width)                    │
└────────────────────────────────────────────┘
```

### Sidebar — "Live from the Canopy"

- Pulsing "LIVE" indicator at top
- Detection cards: bird thumbnail + common name + relative timestamp ("2 mins ago"), newest at top
- The sidebar is internally scrollable (overflow-y: auto); the overall page does not scroll
- When a new detection arrives (detected by comparing the timestamp of the first item in the latest poll response against the previous response), the list updates and scrolls smoothly to the top
- Consecutive detections of the same species appear as separate cards
- Polls `/api/recent` every 15 seconds

### Hero — Rotating Slides

Rotates every 15 seconds (crossfade duration: 0.5s). Sequence is fixed:

1. Last Identified
2. Daily Top Birds
3. Top 30 Days
4. Rare Visitors

**No Activity state:** If `/api/recent` returns no detections within the last 30 minutes, the entire hero rotation is suspended and replaced with the No Activity slide. Normal rotation resumes automatically when a new detection appears.

**Slide skip:** Slides with no data (e.g. Top 30 Days on a brand-new installation) are skipped silently — the rotation advances to the next slide. If all data-dependent slides have no data, the No Activity slide is shown regardless of the 30-minute rule.

| Slide | Content |
|---|---|
| Last Identified | Full-bleed bird photo, common name, fun fact from Wikipedia. If index 0 and index 1 in the `/api/recent` response are the same species, shows "Species Spotlight" instead: species name + total detection count today |
| Daily Top Birds | Heatmap: top 10 species today on Y-axis, hour-of-day (0–23) on X-axis, cell colour = detection count. Colour scale is per-row normalised (each species row's darkest cell = that species' peak hour count) |
| Top 30 Days | Top 10 species by detection count over the last 30 days (rolling window). Shows rank, common name, count |
| Rare Visitors | Bottom 5 species by all-time detection count (minimum 1 detection to qualify). Shows common name + total all-time count. Slide is skipped if all-time per-species data is not available from BirdNET-Go API |
| No Activity | "The birds are resting... check back at dusk!" — full-screen. Fixed string, no time-of-day variation in v1 |

### Stats Bar

Persistent strip at the bottom, full width:

> `20 species today · 50 in last 30 days · 124 ever · 3 new this week`

- "Today" = distinct species count derived client-side from `/api/today`
- "Last 30 days" = unique species in last 30-day rolling window, from `/api/history`
- "Ever" = all-time unique species total, from `/api/history`
- "New this week" = species with their first-ever detection at this sanctuary within the last 7 days (rolling), from `/api/history`

---

## Data & Polling

Three independent polling loops on the client:

| Endpoint | Data | Interval |
|---|---|---|
| `GET /api/recent` | Last 20 detections, newest first | 15s |
| `GET /api/today` | All detections today (Pi's local timezone), grouped by species | 60s |
| `GET /api/history` | Top species (30-day rolling window) + all-time per-species counts + new last 7 days | 5 mins |

"Today" is determined by the Pi's local timezone. The client trusts the grouping returned by the endpoint and does not apply its own timezone logic.

**Error handling:** If a polling request fails (network error, non-200, timeout), the last successfully fetched data remains displayed — no error banner, the display stays on air. If `/api/recent` has not returned a successful response for more than 5 minutes (measured from the last successful response, not from detection timestamps), the No Activity slide is shown as a network-failure fallback.

---

## Bird Photos

- Local images stored in `public/birds/`, named by **common name**: lowercase, apostrophes and non-alphanumeric characters stripped, spaces replaced with hyphens (e.g. `eurasian-wren.jpg`, `cettis-warbler.jpg`). Supported formats: `.jpg`, `.png`, `.webp` (tried in that order via separate `<img>` src attempts).
- When `LastIdentified` mounts, `BirdImage` immediately fetches from the Wikipedia cache (triggering an API call if not cached). It does not wait for an image load error — the fetch is eager.
- If the local image loads successfully, the Wikipedia thumbnail URL is available in cache but unused.
- If the local image errors, the Wikipedia thumbnail URL (already fetched) is used as `src`.
- If Wikipedia returns no thumbnail: shows a neutral feather/silhouette placeholder SVG.
- Wikipedia results (photo URL + fun fact) cached together in a module-level `Map` in `utils/wikipedia.js` — keyed by common name. While a fetch is in-flight, its `Promise` is stored in the cache, so concurrent calls for the same species await the same request.

---

## Fun Facts

- Fetched from Wikipedia's summary API (`/api/rest_v1/page/summary/{title}`) using the species common name
- The same single API call returns both the thumbnail image URL and the extract (fun fact)
- Cached in `utils/wikipedia.js` alongside the photo URL — one fetch populates both
- Displayed on the Last Identified slide below the species name

---

## Project Structure

```
beaknik/
├── server/
│   ├── index.js          # Express: proxy routes + static file serving
│   └── .env              # BIRDNET_GO_URL=http://10.x.x.x:8080
├── src/
│   ├── App.jsx           # Top-level layout: Hero + Sidebar + StatsBar
│   ├── hooks/
│   │   ├── useDetections.js    # polls /api/recent (15s)
│   │   ├── useTodayStats.js    # polls /api/today (60s)
│   │   └── useHistory.js       # polls /api/history (5 mins)
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── StatsBar.jsx
│   │   ├── BirdImage.jsx       # local → Wikipedia → placeholder fallback
│   │   └── hero/
│   │       ├── HeroRotator.jsx       # slide sequencing + crossfade
│   │       ├── LastIdentified.jsx
│   │       ├── DailyTopBirds.jsx     # heatmap
│   │       ├── Top30Days.jsx
│   │       ├── RareVisitors.jsx
│   │       └── NoActivity.jsx
│   └── utils/
│       └── wikipedia.js        # Wikipedia API fetch + in-memory cache
├── public/
│   └── birds/            # Local species photos (e.g. eurasian-wren.jpg)
├── package.json
└── vite.config.js
```

---

## Visual Design

**Colour palette:** Green and white, suitable for nature sanctuaries and national parks. Exact shades to be determined during implementation, but the intent is a clean, natural feel — dark forest green for backgrounds/accents, white for text and cards.

**Typography and feel:** Legible at distance (large screen) and on iPad. Clean, minimal — the birds are the content, not the UI chrome.

---

## Out of Scope (v1)

- Audio playback
- Spectrogram display
- User interaction
- Multi-monitor simultaneous view
- Authentication / access control
