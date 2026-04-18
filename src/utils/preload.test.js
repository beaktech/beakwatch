import { describe, it, expect, beforeEach, vi } from 'vitest'
import { birdImageUrl, preloadImages } from './preload.js'

describe('birdImageUrl', () => {
  it('slugs the common name and encodes it in the query string', () => {
    const url = birdImageUrl("Cetti's Warbler", 100)
    expect(url).toMatch(/^\/birds\/cettis-warbler\.jpg\?name=Cetti/)
    expect(url).toContain('w=')
  })

  it('scales width by devicePixelRatio, capped at 2', () => {
    const originalDpr = window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true })
    expect(birdImageUrl('Robin', 50)).toContain('w=100')
    Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, configurable: true })
  })
})

describe('preloadImages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('creates an Image for each url on idle', () => {
    const created = []
    const OriginalImage = global.Image
    global.Image = class {
      constructor() { created.push(this) }
      set src(v) { this._src = v }
      get src() { return this._src }
    }
    preloadImages(['/birds/robin.jpg?w=40', '/birds/wren.jpg?w=40'])
    vi.runAllTimers()
    expect(created.length).toBeGreaterThanOrEqual(2)
    expect(created.map(i => i.src)).toContain('/birds/robin.jpg?w=40')
    global.Image = OriginalImage
  })

  it('dedupes repeated urls', () => {
    const created = []
    const OriginalImage = global.Image
    global.Image = class {
      constructor() { created.push(this) }
      set src(v) { this._src = v }
      get src() { return this._src }
    }
    const url = '/birds/dedupe-test.jpg?w=40'
    preloadImages([url])
    vi.runAllTimers()
    preloadImages([url])
    vi.runAllTimers()
    const hits = created.filter(i => i.src === url)
    expect(hits).toHaveLength(1)
    global.Image = OriginalImage
  })
})
