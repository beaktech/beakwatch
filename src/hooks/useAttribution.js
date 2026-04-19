import { useState, useEffect } from 'react'
import { fetchAttribution } from '../utils/wikipedia.js'

export function useAttribution(commonName) {
  const [attribution, setAttribution] = useState(null)
  useEffect(() => {
    if (!commonName) return
    let alive = true
    setAttribution(null)
    fetchAttribution(commonName).then(a => { if (alive) setAttribution(a) })
    return () => { alive = false }
  }, [commonName])
  return attribution
}
