import { useState, useEffect } from 'react'
import { fetchWikipedia } from '../utils/wikipedia.js'

export default function Attribution({ commonName }) {
  const [attribution, setAttribution] = useState(null)

  useEffect(() => {
    setAttribution(null)
    fetchWikipedia(commonName).then(d => setAttribution(d.attribution))
  }, [commonName])

  if (!attribution) return null

  const parts = [attribution.artist, attribution.license].filter(Boolean).join(' / ')
  if (!parts) return null

  return (
    <span className="absolute bottom-2 right-2 text-[10px] text-white/50 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full leading-tight pointer-events-none">
      {parts}
    </span>
  )
}
