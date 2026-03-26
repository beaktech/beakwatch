import { usePolling } from './usePolling.js'

async function fetchWeekly() {
  const res = await fetch('/api/today?date=2026-03-25')
  if (!res.ok) throw new Error('Failed to fetch today activity')
  return res.json()
}

export function useWeeklyActivity() {
  const { data } = usePolling(fetchWeekly, 60_000)
  return { weeklyActivity: data ?? [] }
}
