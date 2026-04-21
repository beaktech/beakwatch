import { useRef, useEffect, useMemo } from 'react'
import { toSlug } from '../../utils/formatters.js'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
// Module-scope image cache survives effect re-runs so we don't reallocate
// HTMLImageElements on every todayStats poll.
const imageCache = new Map()
const CELL_H = 32
const CELL_GAP = 4
const THUMB_SIZE = 28
const THUMB_GAP = 8
const LABEL_W = 170
const CELL_RADIUS = 5
const HEADER_H = 28

// Grass green gradient: empty → light → mid → dark
const COLOR_STOPS = [
  [220, 237, 200], // light grass
  [144, 196, 99],  // mid grass
  [92, 148, 46],   // deeper grass
  [54, 101, 23],   // deep grass
]

function getColor(intensity) {
  if (intensity === 0) return '#e2e8f0'
  const t = Math.min(intensity, 1)
  const segments = COLOR_STOPS.length - 1
  const seg = Math.min(Math.floor(t * segments), segments - 1)
  const localT = t * segments - seg
  const [r1, g1, b1] = COLOR_STOPS[seg]
  const [r2, g2, b2] = COLOR_STOPS[seg + 1]
  return `rgb(${Math.round(r1 + localT * (r2 - r1))},${Math.round(g1 + localT * (g2 - g1))},${Math.round(b1 + localT * (b2 - b1))})`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function hourLabel(h) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export default function DailyTopBirds({ todayStats }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasWrapperRef = useRef(null)

  const top10 = useMemo(() => {
    const bySpecies = {}
    for (const d of todayStats) {
      if (!bySpecies[d.commonName]) bySpecies[d.commonName] = {}
      bySpecies[d.commonName][d.hour] = (bySpecies[d.commonName][d.hour] ?? 0) + d.count
    }
    return Object.entries(bySpecies)
      .map(([name, hours]) => ({ name, hours, total: Object.values(hours).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }, [todayStats])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const canvasWrapper = canvasWrapperRef.current
    if (!canvas || !container || !canvasWrapper || top10.length === 0) return

    // Thumbnails are served by the server image cache (server/birdImages.js) —
    // missing images are fetched from Wikipedia and cached to disk on first request.
    const dpr = window.devicePixelRatio || 1
    const thumbReqWidth = Math.round(THUMB_SIZE * Math.min(dpr, 2))
    const images = {}
    top10.forEach(({ name }) => {
      const cacheKey = `${name}:${thumbReqWidth}`
      let img = imageCache.get(cacheKey)
      if (!img) {
        img = new Image()
        img.src = `/birds/${toSlug(name)}.jpg?name=${encodeURIComponent(name)}&w=${thumbReqWidth}`
        img.onerror = () => { img._failed = true }
        imageCache.set(cacheKey, img)
      }
      images[name] = img
      if (img.complete) {
        // already loaded — draw after layout
      } else {
        img.addEventListener('load', draw, { once: true })
        img.addEventListener('error', draw, { once: true })
      }
    })

    function draw() {
      const W = container.offsetWidth - 64 // subtract p-8 padding (32px each side)
      const availH = canvasWrapper.offsetHeight
      if (!W || !availH) return

      // Shrink cell height to fit available space on smaller screens
      const cellH = Math.min(CELL_H, Math.floor((availH - HEADER_H + CELL_GAP) / top10.length) - CELL_GAP)
      const thumbSize = Math.min(THUMB_SIZE, cellH - 4)

      const dpr = window.devicePixelRatio || 1
      const currentHour = new Date().getHours()
      const cellW = Math.floor((W - LABEL_W - CELL_GAP * 23) / 24)
      const totalH = HEADER_H + top10.length * (cellH + CELL_GAP) - CELL_GAP

      canvas.width = W * dpr
      canvas.height = totalH * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${totalH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, totalH)

      // Hour header labels
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      HOURS.forEach(h => {
        if (h % 3 === 0) {
          const x = LABEL_W + h * (cellW + CELL_GAP) + cellW / 2
          ctx.fillStyle = '#94a3b8'
          ctx.fillText(hourLabel(h), x, HEADER_H / 2 - 5)
        }
      })

      // "Now" arrow for current hour
      const arrowX = LABEL_W + currentHour * (cellW + CELL_GAP) + cellW / 2
      const arrowSize = 8
      const arrowY = HEADER_H - arrowSize - 1
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY + arrowSize)
      ctx.lineTo(arrowX - arrowSize, arrowY)
      ctx.lineTo(arrowX + arrowSize, arrowY)
      ctx.closePath()
      ctx.fill()

      top10.forEach(({ name, hours }, row) => {
        const y = HEADER_H + row * (cellH + CELL_GAP)
        const maxForRow = Math.max(1, ...Object.values(hours))

        // Rounded-square thumbnail
        const img = images[name]
        const thumbX = 0
        const thumbY = y + (cellH - thumbSize) / 2
        ctx.save()
        roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, CELL_RADIUS)
        if (img?.complete && img.naturalWidth > 0 && !img._failed) {
          ctx.clip()
          ctx.drawImage(img, thumbX, thumbY, thumbSize, thumbSize)
        } else {
          ctx.fillStyle = '#e2e8f0'
          ctx.fill()
        }
        ctx.restore()

        // Species label
        ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.fillStyle = '#475569'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        const label = name.length > 18 ? name.slice(0, 17) + '…' : name
        ctx.fillText(label, thumbSize + THUMB_GAP, y + cellH / 2)

        // 24 hour cells
        HOURS.forEach(h => {
          const count = hours[h] ?? 0
          const x = LABEL_W + h * (cellW + CELL_GAP)
          const intensity = count / maxForRow

          roundRect(ctx, x, y, cellW, cellH, CELL_RADIUS)
          ctx.fillStyle = getColor(intensity)
          ctx.fill()

          // Count label inside cell
          if (count > 0 && cellW >= 18 && cellH >= 16) {
            ctx.font = `bold ${cellW >= 26 ? 10 : 8}px Inter, system-ui, sans-serif`
            ctx.fillStyle = intensity > 0.55 ? 'rgba(255,255,255,0.92)' : '#3a6b14'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(count > 99 ? '99+' : String(count), x + cellW / 2, y + cellH / 2)
          }
        })
      })
    }

    let rafId = requestAnimationFrame(draw)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
    observer?.observe(container)
    observer?.observe(canvasWrapper)
    return () => {
      cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
  }, [top10])

  return (
    <div ref={containerRef} className="h-full flex flex-col p-8 bg-white overflow-hidden">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Activity Patterns</h2>
      <p className="text-sm text-slate-400 mb-6">
        Detection frequency by hour · today · <span className="text-amber-500 font-medium">▼ now</span>
      </p>
      <div ref={canvasWrapperRef} className="flex-1 min-h-0">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
