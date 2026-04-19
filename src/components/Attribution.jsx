import { useAttribution } from '../hooks/useAttribution.js'

export default function Attribution({ commonName }) {
  const attribution = useAttribution(commonName)
  if (!attribution) return null

  const parts = [attribution.artist, attribution.license].filter(Boolean).join(' / ')
  if (!parts) return null

  return (
    <span className="absolute bottom-3 right-3 text-[11px] text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full leading-tight pointer-events-none">
      © {parts}
    </span>
  )
}
