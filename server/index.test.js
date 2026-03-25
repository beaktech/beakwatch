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

  it('GET /api/weekly sums hourly counts across 7 previous days', async () => {
    const hourly = Array(24).fill(0)
    hourly[8] = 4
    hourly[9] = 6
    // All 7 days return the same data; counts should be summed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ common_name: 'Redwing', hourly_counts: hourly }],
    })
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/weekly')
    expect(res.status).toBe(200)
    expect(res.body).toContainEqual({ commonName: 'Redwing', hour: 8, count: 28 }) // 4 × 7
    expect(res.body).toContainEqual({ commonName: 'Redwing', hour: 9, count: 42 }) // 6 × 7
  })

  it('GET /api/recent returns 502 when BirdNET-Go is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const { default: app } = await import('./index.js')
    const res = await request(app).get('/api/recent')
    expect(res.status).toBe(502)
  })
})
