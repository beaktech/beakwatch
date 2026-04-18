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

export default function HeroRotator({ detections, todayStats = [], history, lastSuccessAt }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const intervalRef = useRef(null)
  const tidRef = useRef(null)

  const recentStale = isRecentActivityStale(detections)
  const isSpotlight =
    detections.length >= 2 &&
    detections[0].commonName === detections[1].commonName

  const slides = useMemo(() => [
    { key: 'last', hasData: detections.length > 0 && !recentStale && !isNetworkStale(lastSuccessAt) },
    { key: 'profile', hasData: detections.length > 0 },
    { key: 'today', hasData: todayStats.length > 0 },
    { key: 'resting', hasData: todayStats.length === 0 },
    { key: 'top30', hasData: (history?.top30Days?.length ?? 0) > 0 },
    { key: 'rare', hasData: (history?.rareVisitors?.length ?? 0) > 0 },
  ].filter(s => s.hasData).map(s => s.key), [detections, todayStats, history, lastSuccessAt, recentStale])

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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Advance to next slide"
      className="h-full transition-opacity duration-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
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
      {currentSlide === 'resting' && <NoActivity />}
      {currentSlide === 'top30' && <Top30Days species={history.top30Days} />}
      {currentSlide === 'rare' && <RareVisitors species={history.rareVisitors} />}
    </div>
  )
}
