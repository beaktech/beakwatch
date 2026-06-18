import { createPollingHook } from './createPollingHook.js'

const usePoll = createPollingHook('/api/today', 60_000)

export function useTodayStats() {
  const { data } = usePoll()
  return { todayStats: data ?? [] }
}
