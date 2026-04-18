import { toSlug } from './formatters.js'

export function birdImageUrl(commonName, width) {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const targetWidth = Math.round(width * dpr)
  return `/birds/${toSlug(commonName)}.jpg?name=${encodeURIComponent(commonName)}&w=${targetWidth}`
}

const inflight = new Set()

const schedule = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb, { timeout: 3000 })
  : (cb) => setTimeout(cb, 1500)

export function preloadImages(urls) {
  if (typeof window === 'undefined' || !urls?.length) return
  schedule(() => {
    for (const url of urls) {
      if (inflight.has(url)) continue
      inflight.add(url)
      const img = new Image()
      img.decoding = 'async'
      if ('fetchPriority' in img) img.fetchPriority = 'low'
      img.src = url
    }
  })
}
