import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, '..', 'cache', 'birds')

// Wikimedia requires a descriptive User-Agent identifying the app + contact.
// See https://meta.wikimedia.org/wiki/User-Agent_policy
// Operators deploying their own fork should set BEAKWATCH_CONTACT to a repo
// URL or email so Wikimedia can reach you if rate-limit issues arise.
const CONTACT = process.env.BEAKWATCH_CONTACT || 'https://github.com/beaktech/beakwatch'
const UA = `beakwatch/0.1 (${CONTACT}; bird detection kiosk) Node-fetch`

const inflight = new Map()

// Simple concurrency limiter — at most N outbound Wikipedia/Wikimedia requests at once.
const MAX_CONCURRENT = 2
let active = 0
const queue = []
function acquire() {
  return new Promise(resolve => {
    const tryRun = () => {
      if (active < MAX_CONCURRENT) {
        active++
        resolve(() => { active--; const next = queue.shift(); if (next) next() })
      } else {
        queue.push(tryRun)
      }
    }
    tryRun()
  })
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(url, { retries = 3, backoffMs = 1500 } = {}) {
  const release = await acquire()
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } })
      if (res.status !== 429) return res
      if (attempt === retries) return res
      const retryAfter = parseInt(res.headers.get('retry-after'), 10)
      const wait = (Number.isFinite(retryAfter) ? retryAfter * 1000 : backoffMs * Math.pow(2, attempt))
      await sleep(wait)
    }
  } finally {
    release()
  }
}

// Wikimedia's image servers only generate thumbnails at a fixed set of
// standard widths. Direct (hotlinked) requests for any other width are
// rejected with HTTP 400 ("Use thumbnail sizes listed on ...").
// See https://www.mediawiki.org/wiki/Common_thumbnail_sizes
const WIKI_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840]

// Round a requested width UP to the nearest standard Wikimedia size, matching
// how Wikimedia itself rounds API requests. The browser scales the slightly
// larger image down in CSS, so no detail is lost.
function snapToWikiWidth(width) {
  return WIKI_THUMB_WIDTHS.find(w => w >= width) ?? WIKI_THUMB_WIDTHS[WIKI_THUMB_WIDTHS.length - 1]
}

// Rewrites a Wikimedia thumbnail URL (.../<oldW>px-Name.jpg) to a standard width.
export function resizeWikiPhoto(url, width) {
  if (!url || !width) return url
  const target = snapToWikiWidth(Math.round(width))
  return url.replace(/\/(\d+)px-([^/]+)$/, (_m, _oldW, name) => `/${target}px-${name}`)
}

async function downloadFromWikipedia(commonName, width) {
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName)}`
  const summaryRes = await fetchWithRetry(summaryUrl)
  if (!summaryRes.ok) {
    console.warn(`[birdImages] Wikipedia summary ${summaryRes.status} for "${commonName}"`)
    return null
  }
  const data = await summaryRes.json()
  const thumb = data.thumbnail?.source
  if (!thumb) {
    console.warn(`[birdImages] No thumbnail in Wikipedia summary for "${commonName}"`)
    return null
  }
  const sized = resizeWikiPhoto(thumb, width)
  const imgRes = await fetchWithRetry(sized)
  if (!imgRes.ok) {
    console.warn(`[birdImages] Image fetch ${imgRes.status} for "${commonName}" at ${sized}`)
    return null
  }
  console.log(`[birdImages] Cached "${commonName}" @ ${width}px`)
  return Buffer.from(await imgRes.arrayBuffer())
}

export async function getBirdImage({ slug, name, width }) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  const filepath = join(CACHE_DIR, `${slug}-${width}.jpg`)

  try {
    return await fs.readFile(filepath)
  } catch { /* cache miss — fall through */ }

  const key = `${slug}-${width}`
  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    const buf = await downloadFromWikipedia(name, width)
    if (buf) await fs.writeFile(filepath, buf)
    return buf
  })()
  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}
