import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('.env', import.meta.url).pathname })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const BIRDNET_GO_URL = process.env.BIRDNET_GO_URL || 'http://localhost:8080'
const PORT = process.env.PORT || 3000

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr()
}

function daysAgoStr(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

async function birdnetFetch(path) {
  const res = await fetch(`${BIRDNET_GO_URL}${path}`)
  if (!res.ok) throw new Error(`BirdNET-Go ${res.status}: ${path}`)
  return res.json()
}

// GET /api/recent — last 20 detections, newest first
// BirdNET-Go: GET /api/v2/detections/recent?limit=20
// Field notes: camelCase (commonName, scientificName), timestamp is null — combine date+time
app.get('/api/recent', async (req, res) => {
  try {
    const data = await birdnetFetch('/api/v2/detections/recent?limit=20')
    res.json(data.map(d => ({
      commonName: d.commonName,
      scientificName: d.scientificName,
      confidence: d.confidence,
      timestamp: `${d.date}T${d.time}`,
    })))
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/today — flat [{commonName, hour, count}] for today's heatmap
// Tries analytics/daily first; falls back to aggregating live detections if empty
app.get('/api/today', async (req, res) => {
  try {
    const today = todayStr()
    const daily = await birdnetFetch(`/api/v2/analytics/species/daily?date=${today}`)
    if (Array.isArray(daily) && daily.length > 0) {
      const flat = []
      for (const s of daily) {
        if (!Array.isArray(s.hourly_counts)) continue
        s.hourly_counts.forEach((count, hour) => {
          if (count > 0) flat.push({ commonName: s.common_name, hour, count })
        })
      }
      return res.json(flat)
    }

    // Fallback: aggregate from live detections (analytics not yet computed for today)
    const recent = await birdnetFetch('/api/v2/detections/recent?limit=2000')
    const hourCounts = {}
    for (const d of recent) {
      if (d.date !== today) continue
      const hour = d.time ? parseInt(d.time.slice(0, 2), 10) : null
      if (hour === null || isNaN(hour)) continue
      const key = `${d.commonName}::${hour}`
      hourCounts[key] = (hourCounts[key] ?? 0) + 1
    }
    const flat = Object.entries(hourCounts).map(([key, count]) => {
      const [commonName, hourStr] = key.split('::')
      return { commonName, hour: Number(hourStr), count }
    })
    res.json(flat)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/debug/today — raw BirdNET-Go response for diagnosing field names
app.get('/api/debug/today', async (req, res) => {
  try {
    const data = await birdnetFetch(`/api/v2/analytics/species/daily?date=${todayStr()}`)
    res.json({ date: todayStr(), count: Array.isArray(data) ? data.length : 'not-array', sample: Array.isArray(data) ? data.slice(0, 2) : data })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/history — aggregated stats: top 30-day species, rare visitors, counts
// Combines three BirdNET-Go calls in parallel
app.get('/api/history', async (req, res) => {
  try {
    const [summary30, allTime, newSpecies] = await Promise.all([
      birdnetFetch(`/api/v2/analytics/species/summary?start_date=${daysAgoStr(30)}&end_date=${todayStr()}`),
      birdnetFetch(`/api/v2/analytics/species/summary?start_date=2010-01-01&end_date=${todayStr()}`),
      birdnetFetch(`/api/v2/analytics/species/detections/new?start_date=${daysAgoStr(7)}&end_date=${todayStr()}`),
    ])

    const top30Days = [...summary30]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(s => ({ commonName: s.common_name, count: s.count }))

    const rareVisitors = [...allTime]
      .sort((a, b) => a.count - b.count)
      .slice(0, 6)
      .map(s => ({ commonName: s.common_name, allTimeCount: s.count }))

    res.json({
      top30Days,
      rareVisitors,
      speciesLast30Days: summary30.length,
      speciesAllTime: allTime.length,
      newThisWeek: newSpecies.length,
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.use(express.static(join(__dirname, '..', 'dist')))

app.get('*path', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Beaknik running on http://localhost:${PORT}`))
}

export default app
