import { useState, useEffect, useRef } from 'react'
import LastIdentified from './LastIdentified.jsx'
import BirdProfile from './BirdProfile.jsx'
import DailyTopBirds from './DailyTopBirds.jsx'
import Top30Days from './Top30Days.jsx'
import RareVisitors from './RareVisitors.jsx'
import NoActivity from './NoActivity.jsx'

const SLIDE_INTERVAL = 20_000
const NO_ACTIVITY_WINDOW = 30 * 60_000
const STALE_THRESHOLD = 5 * 60_000

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

  const slides = [
    { key: 'last', hasData: detections.length > 0 && !recentStale && !isNetworkStale(lastSuccessAt) },
    { key: 'profile', hasData: detections.length > 0 },
    { key: 'today', hasData: todayStats.length > 0 },
    { key: 'resting', hasData: todayStats.length === 0 },
    { key: 'top30', hasData: (history?.top30Days?.length ?? 0) > 0 },
    { key: 'rare', hasData: (history?.rareVisitors?.length ?? 0) > 0 },
  ].filter(s => s.hasData).map(s => s.key)

  const availableRef = useRef(slides)
  availableRef.current = slides

  function advance() {
    setVisible(false)
    tidRef.current = setTimeout(() => {
      setSlideIndex(i => (i + 1) % (availableRef.current.length || 1))
      setVisible(true)
    }, 500)
  }

  function startInterval() {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(advance, SLIDE_INTERVAL)
  }

  useEffect(() => {
    startInterval()
    return () => { clearInterval(intervalRef.current); clearTimeout(tidRef.current) }
  }, [])

  function handleClick() {
    clearTimeout(tidRef.current)
    advance()
    startInterval()
  }

  if (slides.length === 0) return <NoActivity />

  const currentSlide = slides[slideIndex % slides.length]
  const todayCount = currentSlide === 'last'
    ? todayStats.filter(d => d.commonName === detections[0]?.commonName).reduce((sum, d) => sum + d.count, 0)
    : 0

  return (
    <div
      className="h-full transition-opacity duration-500 cursor-pointer"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={handleClick}
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
