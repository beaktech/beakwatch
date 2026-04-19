import { useAttribution } from '../hooks/useAttribution.js'

export default function AttributionTooltip({ commonName, children }) {
  const attribution = useAttribution(commonName)
  const parts = attribution
    ? [attribution.artist, attribution.license].filter(Boolean).join(' / ')
    : null

  return (
    <div className="relative group">
      {children}
      {parts && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity z-10"
        >
          © {parts}
        </span>
      )}
    </div>
  )
}
