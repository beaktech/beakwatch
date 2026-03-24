import { describe, it, expect, vi, beforeEach } from 'vitest'

// Clear module cache between tests so the module-level Map is fresh
beforeEach(() => {
  vi.resetModules()
})

describe('fetchWikipedia', () => {
  it('returns photo and extract from Wikipedia summary API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: 'The Eurasian wren is a tiny bird.',
        thumbnail: { source: 'https://example.com/wren.jpg' },
      }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Eurasian Wren')

    expect(result).toEqual({
      extract: 'The Eurasian wren is a tiny bird.',
      photoUrl: 'https://example.com/wren.jpg',
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Eurasian%20Wren'
    )
  })

  it('returns null photoUrl when thumbnail is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'Some bird.', thumbnail: undefined }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Unknown Bird')

    expect(result.photoUrl).toBeNull()
    expect(result.extract).toBe('Some bird.')
  })

  it('caches results and only fetches once for the same species', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'A bird.', thumbnail: { source: 'http://x.com/img.jpg' } }),
    })

    const { fetchWikipedia } = await import('./wikipedia.js')
    await fetchWikipedia('Robin')
    await fetchWikipedia('Robin')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null values when Wikipedia returns a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const { fetchWikipedia } = await import('./wikipedia.js')
    const result = await fetchWikipedia('Nonexistent Bird')

    expect(result).toEqual({ extract: null, photoUrl: null })
  })
})
