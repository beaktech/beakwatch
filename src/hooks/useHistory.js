import { createPollingHook } from './createPollingHook.js'

const usePoll = createPollingHook('/api/history', 5 * 60_000)

export function useHistory() {
  const { data } = usePoll()
  return { history: data ?? null }
}
