import { createPollingHook } from './createPollingHook.js'

const usePoll = createPollingHook('/api/recent', 15_000)

export function useDetections() {
  const { data, lastSuccessAt } = usePoll()
  return { detections: data ?? [], lastSuccessAt }
}
