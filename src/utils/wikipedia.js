const cache = new Map()
const originalUrlCache = new Map()
const attributionCache = new Map()

const STORAGE_PREFIX = 'wiki:'
const ATTR_STORAGE_PREFIX = 'wiki-attr:'
const TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

function loadFromStorage(prefix, key) {
  try {
    const raw = localStorage.getItem(prefix + key)
    if (!raw) return null
    const { t, v } = JSON.parse(raw)
    if (Date.now() - t > TTL_MS) {
      localStorage.removeItem(prefix + key)
      return null
    }
    return v
  } catch { return null }
}

function saveToStorage(prefix, key, value) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify({ t: Date.now(), v: value }))
  } catch { /* quota exceeded or storage unavailable — ignore */ }
}

// Rewrites a Wikimedia thumbnail URL to request a specific width.
// Thumbnail URLs look like:
//   https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Name.jpg/320px-Name.jpg
// If the URL doesn't match that pattern (e.g. a direct original), it's returned unchanged.
export function resizeWikiPhoto(url, width) {
  if (!url || !width) return url
  const target = Math.max(1, Math.round(width))
  return url.replace(/\/(\d+)px-([^/]+)$/, (_m, _oldW, name) => `/${target}px-${name}`)
}

function extractFilename(url) {
  if (!url) return null
  const match = url.match(/\/(?:commons|en)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function stripHtml(html) {
  if (!html) return null
  return html.replace(/<[^>]+>/g, '').trim()
}

async function fetchAttributionFromImage(imageUrl) {
  const filename = extractFilename(imageUrl)
  if (!filename) return null
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const page = Object.values(data.query?.pages ?? {})[0]
    const meta = page?.imageinfo?.[0]?.extmetadata
    if (!meta) return null
    const artist = stripHtml(meta.Artist?.value)
    const license = meta.LicenseShortName?.value
    if (!artist && !license) return null
    return { artist, license }
  } catch {
    return null
  }
}

// Fetches summary only — extract + photoUrl. Attribution is fetched lazily
// by callers that need it (Attribution component) via fetchAttribution.
export async function fetchWikipedia(commonName) {
  if (cache.has(commonName)) {
    return cache.get(commonName)
  }

  const stored = loadFromStorage(STORAGE_PREFIX, commonName)
  if (stored) {
    cache.set(commonName, stored)
    return stored
  }

  const promise = (async () => {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName)}`
      const res = await fetch(url)
      if (!res.ok) return { extract: null, photoUrl: null, attribution: null }
      const data = await res.json()
      const photoUrl = data.thumbnail?.source ?? null
      const originalUrl = data.originalimage?.source ?? photoUrl
      originalUrlCache.set(commonName, originalUrl)
      return {
        extract: data.extract ?? null,
        photoUrl,
        attribution: null,
      }
    } catch {
      return { extract: null, photoUrl: null, attribution: null }
    }
  })()

  cache.set(commonName, promise)
  const result = await promise
  cache.set(commonName, result)
  saveToStorage(STORAGE_PREFIX, commonName, result)
  return result
}

export async function fetchAttribution(commonName) {
  if (attributionCache.has(commonName)) {
    return attributionCache.get(commonName)
  }
  const stored = loadFromStorage(ATTR_STORAGE_PREFIX, commonName)
  if (stored) {
    attributionCache.set(commonName, stored)
    return stored
  }

  const promise = (async () => {
    await fetchWikipedia(commonName)
    const originalUrl = originalUrlCache.get(commonName)
    if (!originalUrl) return null
    return fetchAttributionFromImage(originalUrl)
  })()

  attributionCache.set(commonName, promise)
  const result = await promise
  attributionCache.set(commonName, result)
  saveToStorage(ATTR_STORAGE_PREFIX, commonName, result)
  return result
}
