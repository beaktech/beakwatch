import { useState } from 'react'
import { toSlug } from '../utils/formatters.js'

const PLACEHOLDER = '/birds/placeholder.svg'

export default function BirdImage({ commonName, alt, className = '', width = 320, onLoad }) {
  const [failed, setFailed] = useState(false)

  const slug = toSlug(commonName)
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const targetWidth = Math.round(width * dpr)
  const src = failed
    ? PLACEHOLDER
    : `/birds/${slug}.jpg?name=${encodeURIComponent(commonName)}&w=${targetWidth}`

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  )
}
