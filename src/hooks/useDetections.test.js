import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { commonName: 'Eurasian Wren', scientificName: 'Troglodytes troglodytes', timestamp: '2026-03-24T10:00:00Z', confidence: 0.9 },
    ],
  })
})
afterEach(() => { vi.useRealTimers() })

describe('useDetections', () => {
  it('fetches /api/recent and returns detections', async () => {
    const { useDetections } = await import('./useDetections.js')
    const { result } = renderHook(() => useDetections())
    await act(async () => {})
    expect(result.current.detections).toHaveLength(1)
    expect(result.current.detections[0].commonName).toBe('Eurasian Wren')
  })

  it('polls /api/recent every 15 seconds', async () => {
    const { useDetections } = await import('./useDetections.js')
    renderHook(() => useDetections())
    await act(async () => {})
    await act(async () => { vi.advanceTimersByTime(15_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
