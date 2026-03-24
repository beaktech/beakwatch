import { useCallback } from 'react'
import { usePolling } from './usePolling.js'

async function fetchHistory() {
  const res = await fetch('/api/history')
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export function useHistory() {
  const { data } = usePolling(useCallback(fetchHistory, []), 5 * 60_000)
  return { history: data ?? null }
}
