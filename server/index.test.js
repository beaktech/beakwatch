import request from 'supertest'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Express server', () => {
  it('GET /api/recent normalises fields and combines date+time into timestamp', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { commonName: 'Redwing', scientificName: 'Turdus iliacus', confidence: 0.98, date: '2026-03-24', time: '19:02:21' },
      ],
    })
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/recent')
    expect(res.status).toBe(200)
    expect(res.body[0].commonName).toBe('Redwing')
    expect(res.body[0].timestamp).toBe('2026-03-24T19:02:21')
    expect(res.body[0].confidence).toBe(0.98)
  })

  it('GET /api/today expands hourly_counts into flat {commonName, hour, count} items', async () => {
    const hourly = Array(24).fill(0)
    hourly[8] = 3
    hourly[9] = 5
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ common_name: 'Redwing', hourly_counts: hourly }],
    })
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/today')
    expect(res.status).toBe(200)
    expect(res.body).toContainEqual({ commonName: 'Redwing', hour: 8, count: 3 })
    expect(res.body).toContainEqual({ commonName: 'Redwing', hour: 9, count: 5 })
    expect(res.body.length).toBe(2)
  })

  it('GET /api/today falls back to live detections when daily analytics are empty', async () => {
    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // daily analytics empty
      .mockResolvedValueOnce({ ok: true, json: async () => [
        { commonName: 'Redwing', date: todayStr, time: '08:30:00' },
        { commonName: 'Redwing', date: todayStr, time: '08:45:00' },
        { commonName: 'Robin', date: todayStr, time: '09:15:00' },
      ]})
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/today')
    expect(res.status).toBe(200)
    expect(res.body).toContainEqual({ commonName: 'Redwing', hour: 8, count: 2 })
    expect(res.body).toContainEqual({ commonName: 'Robin', hour: 9, count: 1 })
  })

  it('GET /api/history aggregates three BirdNET-Go calls', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ common_name: 'Redwing', count: 50 }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ common_name: 'Redwing', count: 50 }, { common_name: 'Hawfinch', count: 1 }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ common_name: 'Barn Swallow', count_in_period: 1 }] })
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(200)
    expect(res.body.speciesLast30Days).toBe(1)
    expect(res.body.speciesAllTime).toBe(2)
    expect(res.body.newThisWeek).toBe(1)
    expect(res.body.top30Days[0]).toEqual({ commonName: 'Redwing', count: 50 })
    expect(res.body.rareVisitors[0]).toEqual({ commonName: 'Hawfinch', allTimeCount: 1 })
  })

  it('GET /api/recent returns 502 when BirdNET-Go is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/recent')
    expect(res.status).toBe(502)
  })

  it('GET /api/server exposes the active server url and configured servers', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/server')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('active')
    expect(Array.isArray(res.body.servers)).toBe(true)
  })

  it('POST /api/server rejects unknown server urls with 400', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app)
      .post('/api/server')
      .set('Content-Type', 'application/json')
      .send({ url: 'http://not-configured' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Unknown server')
  })

  it('GET /birds rejects slugs containing path traversal with 400', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/birds/..%2f..%2fserver%2findex-320.jpg?name=Robin&w=320')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid image name')
  })

  it('GET /birds rejects slugs with dots or unexpected characters with 400', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/birds/..%5c..%5cfoo.jpg?name=Robin')
    expect(res.status).toBe(400)
  })

  it('GET /birds passes clean slugs through to the image cache', async () => {
    vi.doMock('./birdImages.js', () => ({
      getBirdImage: vi.fn().mockResolvedValue(Buffer.from('jpegbytes')),
    }))
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/birds/eurasian-robin.jpg?name=European%20Robin&w=320')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/jpeg')
    vi.doUnmock('./birdImages.js')
  })

  it('GET unknown /api routes returns 404 JSON instead of the SPA shell', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('does not expose the X-Powered-By header', async () => {
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/server')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('survives a malformed BIRDNET_GO_URL with a clear warning instead of crashing', async () => {
    const prev = { url: process.env.BIRDNET_GO_URL, urls: process.env.BIRDNET_GO_URLS }
    process.env.BIRDNET_GO_URL = '192.168.1.10:8080' // missing http://
    delete process.env.BIRDNET_GO_URLS
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { default: app } = await import('./index.js')
      const res = await request(app).get('/api/server')
      expect(res.status).toBe(200)
      expect(res.body.servers).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('BIRDNET_GO_URL'))
    } finally {
      warn.mockRestore()
      if (prev.url === undefined) delete process.env.BIRDNET_GO_URL
      else process.env.BIRDNET_GO_URL = prev.url
      if (prev.urls !== undefined) process.env.BIRDNET_GO_URLS = prev.urls
    }
  })

  it('GET /api/weather returns temperature, wind, label and emoji', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 12.4, weather_code: 2, wind_speed_10m: 8.7 },
      }),
    })
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/weather')
    expect(res.status).toBe(200)
    expect(res.body.temp).toBe(12)
    expect(res.body.wind).toBe(9)
    expect(res.body.label).toBe('Partly cloudy')
    expect(res.body.emoji).toBe('⛅')
  })
})
