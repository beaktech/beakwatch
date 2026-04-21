import { usePolling } from './usePolling.js'

async function fetchRecent() {
  const res = await fetch('/api/recent')
  if (!res.ok) throw new Error('Failed to fetch recent detections')
  return res.json()
}

export function useDetections() {
  const { data, lastSuccessAt } = usePolling(fetchRecent, 15_000)
  return { detections: data ?? [], lastSuccessAt }
}
