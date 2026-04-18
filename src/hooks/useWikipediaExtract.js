import { useState, useEffect } from 'react'
import { fetchWikipedia } from '../utils/wikipedia.js'

export function useWikipediaExtract(commonName) {
  const [extract, setExtract] = useState(null)
  useEffect(() => {
    if (!commonName) return
    let alive = true
    setExtract(null)
    fetchWikipedia(commonName).then(d => { if (alive) setExtract(d.extract) })
    return () => { alive = false }
  }, [commonName])
  return extract
}
