import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules() })

describe('useWikipediaExtract', () => {
  it('returns the extract for a given common name', async () => {
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchWikipedia: vi.fn().mockResolvedValue({ extract: 'A tiny bird.', photoUrl: null, attribution: null }),
    }))
    const { useWikipediaExtract } = await import('./useWikipediaExtract.js')
    const { result } = renderHook(() => useWikipediaExtract('Wren'))
    await act(async () => {})
    expect(result.current).toBe('A tiny bird.')
  })

  it('returns null while loading', async () => {
    let resolve
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchWikipedia: vi.fn().mockReturnValue(new Promise(r => { resolve = r })),
    }))
    const { useWikipediaExtract } = await import('./useWikipediaExtract.js')
    const { result } = renderHook(() => useWikipediaExtract('Wren'))
    expect(result.current).toBeNull()
    await act(async () => { resolve({ extract: 'loaded', photoUrl: null, attribution: null }) })
  })

  it('does nothing when commonName is falsy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ extract: 'x', photoUrl: null, attribution: null })
    vi.doMock('../utils/wikipedia.js', () => ({ fetchWikipedia: mockFetch }))
    const { useWikipediaExtract } = await import('./useWikipediaExtract.js')
    const { result } = renderHook(() => useWikipediaExtract(null))
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
