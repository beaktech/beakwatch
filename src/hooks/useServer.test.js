import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalLocation = window.location

beforeEach(() => {
  // jsdom's Location is read-only in recent versions; stub via defineProperty.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload: vi.fn() },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  vi.restoreAllMocks()
})

describe('useServer', () => {
  it('fetches /api/server and exposes the active server info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: 'http://a', servers: [{ url: 'http://a', name: 'A' }, { url: 'http://b', name: 'B' }] }),
    })
    const { useServer } = await import('./useServer.js')
    const { result } = renderHook(() => useServer())
    await act(async () => {})
    expect(result.current.serverInfo.active).toBe('http://a')
    expect(result.current.serverInfo.servers).toHaveLength(2)
  })

  it('switchServer POSTs the non-active url and reloads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: 'http://a', servers: [{ url: 'http://a', name: 'A' }, { url: 'http://b', name: 'B' }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: 'http://b' }) })
    global.fetch = fetchMock

    const { useServer } = await import('./useServer.js')
    const { result } = renderHook(() => useServer())
    await act(async () => {})
    await act(async () => { await result.current.switchServer() })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, opts] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/server')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ url: 'http://b' })
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('switchServer is a no-op when no other server is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: 'http://a', servers: [{ url: 'http://a', name: 'A' }] }),
    })
    global.fetch = fetchMock

    const { useServer } = await import('./useServer.js')
    const { result } = renderHook(() => useServer())
    await act(async () => {})
    await act(async () => { await result.current.switchServer() })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.location.reload).not.toHaveBeenCalled()
  })
})
