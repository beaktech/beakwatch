import { describe, it, expect } from 'vitest'
import { toSlug, timeAgo } from './formatters.js'

describe('toSlug', () => {
  it('lowercases and hyphenates common names', () => {
    expect(toSlug('Eurasian Wren')).toBe('eurasian-wren')
  })

  it("strips apostrophes (e.g. Cetti's Warbler)", () => {
    expect(toSlug("Cetti's Warbler")).toBe('cettis-warbler')
  })

  it('strips other non-alphanumeric characters', () => {
    expect(toSlug('Black-and-white Warbler')).toBe('black-and-white-warbler')
  })

  it('collapses multiple hyphens', () => {
    expect(toSlug('Robin  (European)')).toBe('robin-european')
  })
})

describe('timeAgo', () => {
  it('returns "just now" for timestamps under 60 seconds ago', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 30_000).toISOString()
    expect(timeAgo(ts)).toBe('just now')
  })

  it('returns "2 mins ago" for a 2-minute-old timestamp', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 2 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('2 mins ago')
  })

  it('returns "1 hr ago" for a 1-hour-old timestamp', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 60 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('1 hr ago')
  })
})
