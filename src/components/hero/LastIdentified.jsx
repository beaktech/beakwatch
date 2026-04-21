import BirdImage from '../BirdImage.jsx'
import Attribution from '../Attribution.jsx'
import Badge from '../Badge.jsx'
import { useWikipediaExtract } from '../../hooks/useWikipediaExtract.js'

export default function LastIdentified({ detection, isSpotlight, todayCount }) {
  const extract = useWikipediaExtract(detection?.commonName)

  if (!detection) return null

  return (
    <div className="relative h-full overflow-hidden">
      <BirdImage
        commonName={detection.commonName}
        alt={detection.commonName}
        width={1000}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* gradient: transparent top → strong dark bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <Attribution commonName={detection.commonName} />

      {/* slide label badge */}
      <div className="absolute top-6 left-6">
        <Badge variant="dark">{isSpotlight ? 'Species Spotlight' : 'Last Identified'}</Badge>
      </div>

      {/* bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 pt-16">
        <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">
          {detection.commonName}
        </h2>
        {detection.scientificName && (
          <p className="text-lg text-white/50 mt-1 italic">{detection.scientificName}</p>
        )}
        {isSpotlight && todayCount != null && (
          <p className="text-2xl text-white/75 mt-3 font-light">
            {todayCount} detections today
          </p>
        )}
        {!isSpotlight && extract && (
          <p className="text-base text-white/70 mt-4 max-w-xl leading-relaxed line-clamp-3">
            {extract}
          </p>
        )}
      </div>
    </div>
  )
}
