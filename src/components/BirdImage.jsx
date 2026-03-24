import { useState, useEffect } from 'react'
import { toSlug } from '../utils/formatters.js'
import { fetchWikipedia } from '../utils/wikipedia.js'

const PLACEHOLDER = '/birds/placeholder.svg'

export default function BirdImage({ commonName, alt, className = '' }) {
  const [wikiData, setWikiData] = useState(null)
  const [usedWiki, setUsedWiki] = useState(false)

  const slug = toSlug(commonName)
  const localSrc = `/birds/${slug}.jpg`

  // Eagerly fetch Wikipedia data on mount
  useEffect(() => {
    fetchWikipedia(commonName).then(setWikiData)
  }, [commonName])

  function handleError() {
    // Local image failed — fall back to wiki photo or placeholder
    setUsedWiki(true)
  }

  const src = usedWiki
    ? (wikiData?.photoUrl ?? PLACEHOLDER)
    : localSrc

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}
