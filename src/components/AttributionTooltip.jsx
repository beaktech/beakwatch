import { useAttribution } from '../hooks/useAttribution.js'

const PLACEMENT_CLASSES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function AttributionTooltip({ commonName, children, placement = 'top' }) {
  const attribution = useAttribution(commonName)
  const parts = attribution
    ? [attribution.artist, attribution.license].filter(Boolean).join(' / ')
    : null
  const placementClass = PLACEMENT_CLASSES[placement] ?? PLACEMENT_CLASSES.top

  return (
    <div className="relative group">
      {children}
      {parts && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute ${placementClass} whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity z-20`}
        >
          © {parts}
        </span>
      )}
    </div>
  )
}
