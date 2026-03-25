import { useRef, useEffect, useMemo } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const CELL_H = 28
const CELL_GAP = 4
const LABEL_W = 150
const CELL_RADIUS = 4

// Green gradient: empty → light → mid → dark (matching reference's contribution-graph style)
const COLOR_STOPS = [
  [209, 250, 229], // emerald-100 #d1fae5
  [52, 211, 153],  // emerald-400 #34d399
  [5, 150, 105],   // emerald-600 #059669
  [4, 120, 87],    // emerald-700 #047857
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

export default function DailyTopBirds({ todayStats }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  const top10 = useMemo(() => {
    const bySpecies = {}
    for (const d of todayStats) {
      if (!bySpecies[d.commonName]) bySpecies[d.commonName] = {}
      bySpecies[d.commonName][d.hour] = (bySpecies[d.commonName][d.hour] ?? 0) + d.count
    }
    return Object.entries(bySpecies)
      .map(([name, hours]) => ({ name, hours, total: Object.values(hours).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [todayStats])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || top10.length === 0) return

    const draw = () => {
      const W = container.offsetWidth
      if (!W) return

      const dpr = window.devicePixelRatio || 1
      const currentHour = new Date().getHours()
      const cellW = Math.floor((W - LABEL_W - CELL_GAP * 23) / 24)
      const totalH = top10.length * (CELL_H + CELL_GAP) + 28 // 28px for hour labels

      canvas.width = W * dpr
      canvas.height = totalH * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${totalH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, totalH)

      top10.forEach(({ name, hours }, row) => {
        const y = row * (CELL_H + CELL_GAP)
        const maxForRow = Math.max(1, ...Object.values(hours))

        // Species label
        ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const label = name.length > 20 ? name.slice(0, 19) + '…' : name
        ctx.fillText(label, LABEL_W - 10, y + CELL_H / 2)

        // 24 cells
        HOURS.forEach(h => {
          const count = hours[h] ?? 0
          const x = LABEL_W + h * (cellW + CELL_GAP)

          roundRect(ctx, x, y, cellW, CELL_H, CELL_RADIUS)
          ctx.fillStyle = getColor(count / maxForRow)
          ctx.fill()

          // Current hour: amber outline
          if (h === currentHour) {
            roundRect(ctx, x - 1, y - 1, cellW + 2, CELL_H + 2, CELL_RADIUS + 1)
            ctx.strokeStyle = '#f59e0b'
            ctx.lineWidth = 1.5
            ctx.stroke()
          }
        })
      })

      // Hour axis labels
      const labelY = top10.length * (CELL_H + CELL_GAP) + 6
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ;[0, 6, 12, 18, 23].forEach(h => {
        const x = LABEL_W + h * (cellW + CELL_GAP) + cellW / 2
        ctx.fillText(`${h}:00`, x, labelY)
      })
    }

    // Wrap in rAF so offsetWidth is available after first layout paint
    let rafId = requestAnimationFrame(draw)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
    observer?.observe(container)
    return () => {
      cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
  }, [todayStats])

  return (
    <div ref={containerRef} className="h-full flex flex-col p-8 bg-white overflow-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Most Active Today</h2>
      <p className="text-sm text-slate-400 mb-6">
        Detection frequency by hour · <span className="text-amber-500 font-medium">current hour highlighted</span>
      </p>
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
