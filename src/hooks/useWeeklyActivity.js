import { usePolling } from './usePolling.js'

async function fetchWeekly() {
  const res = await fetch('/api/weekly')
  if (!res.ok) throw new Error('Failed to fetch weekly activity')
  return res.json()
}

export function useWeeklyActivity() {
  const { data } = usePolling(fetchWeekly, 5 * 60_000)
  return { weeklyActivity: data ?? [] }
}
