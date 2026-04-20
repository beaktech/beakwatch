import { useAttribution } from '../hooks/useAttribution.js'

const VARIANT_CLASSES = {
  default: 'text-white bg-black backdrop-blur-sm ring-1 ring-white/25',
  subtle: 'text-white/70 bg-black/50 backdrop-blur-sm',
}

export default function Attribution({ commonName, variant = 'default', style }) {
  const attribution = useAttribution(commonName)
  if (!attribution) return null

  const parts = [attribution.artist, attribution.license].filter(Boolean).join(' / ')
  if (!parts) return null

  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default
  const positionClass = style ? 'absolute' : 'absolute bottom-3 right-3'

  return (
    <span
      style={style}
      className={`${positionClass} text-[11px] font-medium ${variantClass} px-2 py-0.5 rounded-full leading-tight pointer-events-none`}
    >
      © {parts}
    </span>
  )
}
