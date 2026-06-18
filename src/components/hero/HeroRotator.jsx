import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import LastIdentified from './LastIdentified.jsx'
import BirdProfile from './BirdProfile.jsx'
import DailyTopBirds from './DailyTopBirds.jsx'
import Top30Days from './Top30Days.jsx'
import RareVisitors from './RareVisitors.jsx'
import NoActivity from './NoActivity.jsx'
import { birdImageUrl, preloadImages } from '../../utils/preload.js'

const SLIDE_INTERVAL = 20_000
const NO_ACTIVITY_WINDOW = 30 * 60_000
const STALE_THRESHOLD = 5 * 60_000

function slideImageUrls(key, { detections, todayStats, history }) {
  switch (key) {
    case 'last':
      return detections[0] ? [birdImageUrl(detections[0].commonName, 1000)] : []
    case 'profile':
      return detections[0] ? [birdImageUrl(detections[0].commonName, 800)] : []
    case 'today':
      return todayStats.slice(0, 15).map(s => birdImageUrl(s.commonName, 28))
    case 'top30':
      return (history?.top30Days ?? []).slice(0, 10).map(s => birdImageUrl(s.commonName, 40))
    case 'rare':
      return (history?.rareVisitors ?? []).slice(0, 6).map(s => birdImageUrl(s.commonName, 400))
    default:
      return []
  }
}

function isNetworkStale(lastSuccessAt) {
  return Date.now() - lastSuccessAt > STALE_THRESHOLD
}

function isRecentActivityStale(detections) {
  if (detections.length === 0) return true
  const latest = new Date(detections[0].timestamp).getTime()
  return Date.now() - latest > NO_ACTIVITY_WINDOW
}

function formatGap(ms) {
  const mins = Math.round(ms / 60_000)
  if (mins < 90) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} hours`
  return `${Math.round(hours / 24)} days`
}

export default function HeroRotator({ detections, todayStats = [], history, lastSuccessAt }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const intervalRef = useRef(null)
  const tidRef = useRef(null)

  const recentStale = isRecentActivityStale(detections)
  const isSpotlight =
    detections.length >= 2 &&
    detections[0].commonName === detections[1].commonName

  // Each slide carries a human title so we can name the ones currently waiting
  // on data. Only slides with data join the rotation; the rest are surfaced in
  // a small persistent notice rather than as a contradictory "resting" screen.
  const catalog = useMemo(() => [
    { key: 'last', title: 'Last Identified', available: detections.length > 0 && !recentStale && !isNetworkStale(lastSuccessAt) },
    { key: 'profile', title: 'Species Profile', available: detections.length > 0 },
    { key: 'today', title: 'Activity Patterns', available: todayStats.length > 0 },
    { key: 'top30', title: 'Most Popular Species', available: (history?.top30Days?.length ?? 0) > 0 },
    { key: 'rare', title: 'Rare Visitors', available: (history?.rareVisitors?.length ?? 0) > 0 },
  ], [detections, todayStats, history, lastSuccessAt, recentStale])

  const slides = useMemo(() => catalog.filter(s => s.available).map(s => s.key), [catalog])
  const unavailable = useMemo(() => catalog.filter(s => !s.available).map(s => s.title), [catalog])

  const availableRef = useRef(slides)
  availableRef.current = slides

  const advance = useCallback(() => {
    setVisible(false)
    tidRef.current = setTimeout(() => {
      setSlideIndex(i => (i + 1) % (availableRef.current.length || 1))
      setVisible(true)
    }, 500)
  }, [])

  const startInterval = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(advance, SLIDE_INTERVAL)
  }, [advance])

  useEffect(() => {
    startInterval()
    return () => { clearInterval(intervalRef.current); clearTimeout(tidRef.current) }
  }, [startInterval])

  useEffect(() => {
    if (slides.length === 0) return
    const nextKey = slides[(slideIndex + 1) % slides.length]
    preloadImages(slideImageUrls(nextKey, { detections, todayStats, history }))
  }, [slideIndex, slides, detections, todayStats, history])

  function handleActivate() {
    clearTimeout(tidRef.current)
    advance()
    startInterval()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActivate()
    }
  }

  if (slides.length === 0) return <NoActivity />

  const currentSlide = slides[slideIndex % slides.length]
  const todayCount = currentSlide === 'last'
    ? todayStats.filter(d => d.commonName === detections[0]?.commonName).reduce((sum, d) => sum + d.count, 0)
    : 0

  // Explain why panels are missing: usually the feed has gone quiet, so lead
  // with how long since the last detection; otherwise we're still building history.
  const gapMs = detections[0] ? Date.now() - new Date(detections[0].timestamp).getTime() : null
  const noticeText =
    gapMs != null && gapMs > NO_ACTIVITY_WINDOW
      ? `No new detections in the last ${formatGap(gapMs)} — some panels inactive`
      : detections.length === 0
        ? 'Waiting for detection data — some panels inactive'
        : 'Building up history — some panels inactive'

  return (
    <div className="relative h-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Advance to next slide"
        className="h-full motion-safe:transition-opacity motion-safe:duration-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        {currentSlide === 'last' && (
          <LastIdentified
            detection={detections[0]}
            isSpotlight={isSpotlight}
            todayCount={todayCount}
          />
        )}
        {currentSlide === 'profile' && <BirdProfile detection={detections[0]} todayStats={todayStats} />}
        {currentSlide === 'today' && <DailyTopBirds todayStats={todayStats} />}
        {currentSlide === 'top30' && <Top30Days species={history.top30Days} />}
        {currentSlide === 'rare' && <RareVisitors species={history.rareVisitors} />}
      </div>

      {/* Persistent, non-fading notice when some panels have no data. Top-right
          is clear of every slide's badges and headings. */}
      {unavailable.length > 0 && (
        <div
          role="status"
          className="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-white/75 whitespace-nowrap"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>{noticeText}</span>
        </div>
      )}
    </div>
  )
}
