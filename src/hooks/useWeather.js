import { createPollingHook } from './createPollingHook.js'

const usePoll = createPollingHook('/api/weather', 10 * 60_000)

export function useWeather() {
  const { data } = usePoll()
  return { weather: data ?? null }
}
