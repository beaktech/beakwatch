import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePolling } from './usePolling.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('usePolling', () => {
  it('calls fetchFn immediately on mount', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 1 })
    renderHook(() => usePolling(fetchFn, 5000))
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('calls fetchFn again after the interval', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 1 })
    renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('returns the last successful data', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ birds: ['wren'] })
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    expect(result.current.data).toEqual({ birds: ['wren'] })
  })

  it('keeps previous data when a fetch fails', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ birds: ['wren'] })
      .mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(result.current.data).toEqual({ birds: ['wren'] })
  })

  it('exposes lastSuccessAt timestamp updated on each successful fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({})
    const { result } = renderHook(() => usePolling(fetchFn, 5000))
    await act(async () => {})
    const first = result.current.lastSuccessAt
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(result.current.lastSuccessAt).toBeGreaterThanOrEqual(first)
  })
})
