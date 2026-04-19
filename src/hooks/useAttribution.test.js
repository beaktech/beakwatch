import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules() })

describe('useAttribution', () => {
  it('returns attribution for a given common name', async () => {
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockResolvedValue({ artist: 'Jane Photographer', license: 'CC BY-SA 4.0' }),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Wren'))
    await act(async () => {})
    expect(result.current).toEqual({ artist: 'Jane Photographer', license: 'CC BY-SA 4.0' })
  })

  it('returns null while loading', async () => {
    let resolve
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockReturnValue(new Promise(r => { resolve = r })),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Wren'))
    expect(result.current).toBeNull()
    await act(async () => { resolve({ artist: 'A', license: 'B' }) })
  })

  it('returns null when fetchAttribution resolves null', async () => {
    vi.doMock('../utils/wikipedia.js', () => ({
      fetchAttribution: vi.fn().mockResolvedValue(null),
    }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution('Unknown'))
    await act(async () => {})
    expect(result.current).toBeNull()
  })

  it('does nothing when commonName is falsy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ artist: 'x', license: 'y' })
    vi.doMock('../utils/wikipedia.js', () => ({ fetchAttribution: mockFetch }))
    const { useAttribution } = await import('./useAttribution.js')
    const { result } = renderHook(() => useAttribution(null))
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
