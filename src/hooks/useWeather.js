import { usePolling } from './usePolling.js'

async function fetchWeather() {
  const res = await fetch('/api/weather')
  if (!res.ok) throw new Error('Failed to fetch weather')
  return res.json()
}

export function useWeather() {
  const { data } = usePolling(fetchWeather, 10 * 60_000)
  return { weather: data ?? null }
}
