import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, '..', 'cache', 'birds')

async function clearCache() {
  await fs.rm(CACHE_DIR, { recursive: true, force: true })
}

beforeEach(async () => {
  await clearCache()
  vi.resetModules()
})
afterEach(async () => {
  await clearCache()
})

function pngBuffer() {
  // Minimal 1x1 PNG.
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ])
}

describe('getBirdImage', () => {
  it('downloads from Wikipedia on a cache miss and writes to disk', async () => {
    const buf = pngBuffer()
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Wren.jpg/320px-Wren.jpg' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      })

    const { getBirdImage } = await import('./birdImages.js')
    const result = await getBirdImage({ slug: 'wren', name: 'Wren', width: 200 })

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBe(buf.length)
    const onDisk = await fs.readFile(join(CACHE_DIR, 'wren-200.jpg'))
    expect(onDisk.length).toBe(buf.length)
  })

  it('serves from disk cache without calling Wikipedia on a hit', async () => {
    const buf = pngBuffer()
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.writeFile(join(CACHE_DIR, 'robin-100.jpg'), buf)

    global.fetch = vi.fn()
    const { getBirdImage } = await import('./birdImages.js')
    const result = await getBirdImage({ slug: 'robin', name: 'Robin', width: 100 })

    expect(result.length).toBe(buf.length)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null and does not write to disk when Wikipedia has no thumbnail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'no photo here' }),
    })
    const { getBirdImage } = await import('./birdImages.js')
    const result = await getBirdImage({ slug: 'nothumb', name: 'Nothing', width: 100 })
    expect(result).toBeNull()
    await expect(fs.readFile(join(CACHE_DIR, 'nothumb-100.jpg'))).rejects.toThrow()
  })

  it('dedupes concurrent requests for the same image', async () => {
    const buf = pngBuffer()
    let summaryCalls = 0
    let imgCalls = 0
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('api/rest_v1/page/summary')) {
        summaryCalls++
        return new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dup.jpg/50px-Dup.jpg' } }),
        }), 20))
      }
      imgCalls++
      return new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      }), 20))
    })

    const { getBirdImage } = await import('./birdImages.js')
    const [a, b] = await Promise.all([
      getBirdImage({ slug: 'dup', name: 'Dup', width: 50 }),
      getBirdImage({ slug: 'dup', name: 'Dup', width: 50 }),
    ])
    expect(a.length).toBe(buf.length)
    expect(b.length).toBe(buf.length)
    expect(summaryCalls).toBe(1)
    expect(imgCalls).toBe(1)
  })

  it('retries after a 429 with Retry-After then succeeds', async () => {
    const buf = pngBuffer()
    let call = 0
    global.fetch = vi.fn(() => {
      call++
      if (call === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: { get: (h) => (h.toLowerCase() === 'retry-after' ? '0' : null) },
        })
      }
      if (call === 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/R.jpg/60px-R.jpg' } }),
        })
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      })
    })

    const { getBirdImage } = await import('./birdImages.js')
    const result = await getBirdImage({ slug: 'r', name: 'R', width: 60 })
    expect(result.length).toBe(buf.length)
    expect(call).toBe(3)
  })
})
