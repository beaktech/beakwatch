import { useState, useEffect } from 'react'
import { fetchWikipedia } from '../utils/wikipedia.js'

export function useWikipediaExtract(commonName) {
  const [extract, setExtract] = useState(null)
  useEffect(() => {
    if (!commonName) return
    setExtract(null)
    fetchWikipedia(commonName).then(d => setExtract(d.extract))
  }, [commonName])
  return extract
}
