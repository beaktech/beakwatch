import { useState, useEffect, useRef, useCallback } from 'react'

export function usePolling(fetchFn, intervalMs) {
  const [data, setData] = useState(null)
  const [lastSuccessAt, setLastSuccessAt] = useState(0)
  const dataRef = useRef(null)

  const run = useCallback(async () => {
    try {
      const result = await fetchFn()
      dataRef.current = result
      setData(result)
      setLastSuccessAt(Date.now())
    } catch {
      // keep previous data, do not update lastSuccessAt
    }
  }, [fetchFn])

  useEffect(() => {
    run()
    const id = setInterval(run, intervalMs)
    return () => clearInterval(id)
  }, [run, intervalMs])

  return { data, lastSuccessAt }
}
