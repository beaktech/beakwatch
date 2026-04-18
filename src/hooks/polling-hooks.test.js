import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Covers the thin wrappers useTodayStats, useHistory, useWeather that all
// delegate to usePolling — one template assertion per hook is enough to
// catch endpoint/interval regressions.

beforeEach(() => {
  vi.useFakeTimers()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: 'value' }) })
})
afterEach(() => { vi.useRealTimers() })

describe('polling hooks', () => {
  it('useTodayStats fetches /api/today and polls every 60s', async () => {
    const { useTodayStats } = await import('./useTodayStats.js')
    renderHook(() => useTodayStats())
    await act(async () => {})
    expect(fetch).toHaveBeenCalledWith('/api/today')
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('useHistory fetches /api/history and polls every 5 minutes', async () => {
    const { useHistory } = await import('./useHistory.js')
    renderHook(() => useHistory())
    await act(async () => {})
    expect(fetch).toHaveBeenCalledWith('/api/history')
    await act(async () => { vi.advanceTimersByTime(5 * 60_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('useWeather fetches /api/weather and polls every 10 minutes', async () => {
    const { useWeather } = await import('./useWeather.js')
    renderHook(() => useWeather())
    await act(async () => {})
    expect(fetch).toHaveBeenCalledWith('/api/weather')
    await act(async () => { vi.advanceTimersByTime(10 * 60_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('useTodayStats returns [] before data loads', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) // never resolves
    const { useTodayStats } = await import('./useTodayStats.js')
    const { result } = renderHook(() => useTodayStats())
    expect(result.current.todayStats).toEqual([])
  })

  it('useHistory returns null before data loads', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { useHistory } = await import('./useHistory.js')
    const { result } = renderHook(() => useHistory())
    expect(result.current.history).toBeNull()
  })
})
