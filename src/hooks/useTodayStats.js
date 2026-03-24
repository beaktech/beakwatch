import { useCallback } from 'react'
import { usePolling } from './usePolling.js'

async function fetchToday() {
  const res = await fetch('/api/today')
  if (!res.ok) throw new Error('Failed to fetch today stats')
  return res.json()
}

export function useTodayStats() {
  const { data } = usePolling(useCallback(fetchToday, []), 60_000)
  return { todayStats: data ?? [] }
}
