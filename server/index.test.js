import request from 'supertest'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the Express app in isolation by mocking the proxy middleware
vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: () => (req, res, next) => {
    if (req.url.startsWith('/api')) {
      res.json({ proxied: true, url: req.url })
    } else {
      next()
    }
  },
}))

const { default: app } = await import('./index.js')

describe('Express server', () => {
  it('proxies /api/recent to BirdNET-Go', async () => {
    const res = await request(app).get('/api/recent')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })

  it('proxies /api/today to BirdNET-Go', async () => {
    const res = await request(app).get('/api/today')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })

  it('proxies /api/history to BirdNET-Go', async () => {
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(200)
    expect(res.body.proxied).toBe(true)
  })
})
