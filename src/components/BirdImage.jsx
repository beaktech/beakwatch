import { useState } from 'react'
import { birdImageUrl } from '../utils/preload.js'

const PLACEHOLDER = '/birds/placeholder.svg'

export default function BirdImage({ commonName, alt, className = '', width = 320, onLoad }) {
  const [failed, setFailed] = useState(false)

  const src = failed ? PLACEHOLDER : birdImageUrl(commonName, width)

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
