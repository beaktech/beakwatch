import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
import { getBirdImage } from './birdImages.js'

dotenv.config({ path: new URL('.env', import.meta.url).pathname })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())
const PORT = process.env.PORT || 3000
const LAT = process.env.LAT || '51.5074'
const LON = process.env.LON || '-0.1278'

// Configure one or more BirdNET-Go servers via env:
//   BIRDNET_GO_URLS=http://host1:8080,http://host2:8080
//   BIRDNET_GO_NAMES=Garden,Office          (optional display names)
// A single BIRDNET_GO_URL is also accepted for the common case.
const SERVERS = (() => {
  const urls = (process.env.BIRDNET_GO_URLS || process.env.BIRDNET_GO_URL || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  const names = (process.env.BIRDNET_GO_NAMES || '').split(',').map(s => s.trim())
  if (urls.length === 0) {
    console.warn('[server] No BirdNET-Go URL configured. Set BIRDNET_GO_URL in .env')
  }
  return urls.map((url, i) => ({ url, name: names[i] || new URL(url).hostname }))
})()
let activeServerUrl = SERVERS[0]?.url ?? null

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
  const res = await fetch(`${activeServerUrl}${path}`)
  if (!res.ok) throw new Error(`BirdNET-Go ${res.status}: ${path}`)
  return res.json()
}

// GET /api/server — current active server + all options (with names)
app.get('/api/server', (req, res) => {
  res.json({ active: activeServerUrl, servers: SERVERS })
})

// POST /api/server — switch active server { url }
app.post('/api/server', (req, res) => {
  const { url } = req.body
  if (!SERVERS.some(s => s.url === url)) return res.status(400).json({ error: 'Unknown server' })
  activeServerUrl = url
  res.json({ active: activeServerUrl })
})

// GET /api/recent — last 20 detections, newest first
// BirdNET-Go: GET /api/v2/detections/recent?limit=20
// Field notes: camelCase (commonName, scientificName), timestamp is null — combine date+time
app.get('/api/recent', async (req, res) => {
  try {
    const data = await birdnetFetch('/api/v2/detections/recent?limit=200')
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
// Accepts optional ?date=YYYY-MM-DD to fetch a specific day (for testing)
// Tries analytics/daily first; falls back to aggregating live detections if empty
app.get('/api/today', async (req, res) => {
  try {
    const today = req.query.date || todayStr()
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

// GET /api/weekly — hourly detection counts summed across the previous 7 complete days
app.get('/api/weekly', async (req, res) => {
  try {
    const days = Array.from({ length: 7 }, (_, i) => daysAgoStr(i + 1))
    const results = await Promise.all(
      days.map(date => birdnetFetch(`/api/v2/analytics/species/daily?date=${date}`).catch(() => []))
    )
    const hourCounts = {}
    for (const dayData of results) {
      for (const species of dayData) {
        const name = species.common_name
        if (!hourCounts[name]) hourCounts[name] = {}
        species.hourly_counts.forEach((count, hour) => {
          if (count > 0) hourCounts[name][hour] = (hourCounts[name][hour] ?? 0) + count
        })
      }
    }
    const flat = []
    for (const [commonName, hours] of Object.entries(hourCounts)) {
      for (const [hour, count] of Object.entries(hours)) {
        flat.push({ commonName, hour: Number(hour), count })
      }
    }
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
      birdnetFetch(`/api/v2/analytics/species/summary?start_date=${daysAgoStr(30)}&end_date=${todayStr()}`).catch(() => []),
      birdnetFetch(`/api/v2/analytics/species/summary?start_date=2010-01-01&end_date=${todayStr()}`).catch(() => []),
      birdnetFetch(`/api/v2/analytics/species/detections/new?start_date=${daysAgoStr(7)}&end_date=${todayStr()}`).catch(() => []),
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

// GET /api/weather — current conditions from Open-Meteo
const WMO_LABELS = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm',
}
const WMO_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️',
}
app.get('/api/weather', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=mph&temperature_unit=celsius&timezone=Europe%2FLondon`
    const data = await fetch(url).then(r => r.json())
    const { temperature_2m: temp, weather_code: code, wind_speed_10m: wind } = data.current
    res.json({
      temp: Math.round(temp),
      wind: Math.round(wind),
      code,
      label: WMO_LABELS[code] ?? 'Unknown',
      emoji: WMO_EMOJI[code] ?? '🌡️',
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// GET /birds/:filename — disk-cached bird images, fetched from Wikipedia on miss.
// Expects ?name=<commonName> for the Wikipedia lookup, optional ?w=<width>.
app.get('/birds/:filename', async (req, res, next) => {
  const m = req.params.filename.match(/^(.+)\.jpg$/)
  if (!m) return next()
  const slug = m[1]
  const name = req.query.name
  const width = Math.min(2000, Math.max(1, parseInt(req.query.w, 10) || 320))
  if (!name) return next()

  try {
    const buf = await getBirdImage({ slug, name, width })
    if (!buf) return res.status(404).end()
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
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
