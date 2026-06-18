import { usePolling } from './usePolling.js'

// Builds a polling hook bound to a single JSON API endpoint. The fetcher is
// created once when this is called (at module load), so its identity stays
// stable across renders and usePolling's interval isn't torn down and
// recreated every render.
export function createPollingHook(path, intervalMs) {
  const fetchJson = async () => {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Failed to fetch ${path}`)
    return res.json()
  }
  return () => usePolling(fetchJson, intervalMs)
}
