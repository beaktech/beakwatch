import { usePolling } from './usePolling.js'

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchWeekly() {
  const res = await fetch('/api/today')
  if (!res.ok) throw new Error('Failed to fetch today activity')
  return res.json()
}

export function useWeeklyActivity() {
  const { data } = usePolling(fetchWeekly, 60_000)
  return { weeklyActivity: data ?? [] }
}
