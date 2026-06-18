import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HeroRotator from './HeroRotator.jsx'

vi.mock('./LastIdentified.jsx', () => ({ default: () => <div>LastIdentified</div> }))
vi.mock('./BirdProfile.jsx', () => ({ default: () => <div>BirdProfile</div> }))
vi.mock('./DailyTopBirds.jsx', () => ({ default: () => <div>DailyTopBirds</div> }))
vi.mock('./Top30Days.jsx', () => ({ default: () => <div>Top30Days</div> }))
vi.mock('./RareVisitors.jsx', () => ({ default: () => <div>RareVisitors</div> }))
vi.mock('./NoActivity.jsx', () => ({ default: () => <div>NoActivity</div> }))

const recentWithActivity = [
  { commonName: 'Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
  { commonName: 'Robin', timestamp: new Date(Date.now() - 60_000).toISOString(), confidence: 0.8 },
]

const props = {
  detections: recentWithActivity,
  todayStats: [{ commonName: 'Wren', hour: 8, count: 35 }],
  history: { top30Days: [{ commonName: 'Wren', count: 100 }], rareVisitors: [{ commonName: 'Hawfinch', allTimeCount: 1 }] },
  lastSuccessAt: Date.now(),
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('HeroRotator', () => {
  it('starts on the LastIdentified slide', () => {
    render(<HeroRotator {...props} />)
    expect(screen.getByText('LastIdentified')).toBeInTheDocument()
  })

  it('advances to the next slide after the slide interval', () => {
    render(<HeroRotator {...props} />)
    act(() => { vi.advanceTimersByTime(20_000) })
    act(() => { vi.advanceTimersByTime(500) }) // crossfade
    expect(screen.getByText('BirdProfile')).toBeInTheDocument()
  })

  it('skips LastIdentified but still rotates other slides when detections are older than 30 minutes', () => {
    const staleDetections = [
      { commonName: 'Wren', timestamp: new Date(Date.now() - 31 * 60_000).toISOString(), confidence: 0.9 },
    ]
    render(<HeroRotator {...props} detections={staleDetections} />)
    // BirdProfile is the first available slide (Last Identified skipped)
    expect(screen.getByText('BirdProfile')).toBeInTheDocument()
  })

  it('skips LastIdentified when lastSuccessAt is stale, but shows other slides', () => {
    render(<HeroRotator {...props} lastSuccessAt={Date.now() - 6 * 60_000} />)
    expect(screen.getByText('BirdProfile')).toBeInTheDocument()
  })

  it('shows NoActivity only when all data sources are empty', () => {
    render(<HeroRotator
      detections={[]}
      todayStats={[]}
      history={{ top30Days: [], rareVisitors: [] }}
      lastSuccessAt={Date.now()}
    />)
    expect(screen.getByText('NoActivity')).toBeInTheDocument()
  })

  it('shows Species Spotlight when top 2 detections are the same species', () => {
    const sameSpecies = [
      { commonName: 'Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
      { commonName: 'Wren', timestamp: new Date(Date.now() - 5_000).toISOString(), confidence: 0.8 },
    ]
    render(<HeroRotator {...props} detections={sameSpecies} />)
    expect(screen.getByText('LastIdentified')).toBeInTheDocument()
  })

  it('does not inject a resting slide when only some data is missing, and explains why panels are hidden', () => {
    const stale = [
      { commonName: 'Wren', timestamp: new Date(Date.now() - 3 * 60 * 60_000).toISOString(), confidence: 0.9 },
    ]
    // Stale detections (Last Identified unavailable) + no today data (Activity
    // Patterns unavailable), but 30-day history present.
    render(<HeroRotator {...props} detections={stale} todayStats={[]} />)

    // First available slide is BirdProfile — no resting/NoActivity in rotation
    expect(screen.getByText('BirdProfile')).toBeInTheDocument()
    expect(screen.queryByText('NoActivity')).not.toBeInTheDocument()

    // A persistent notice explains why some panels are hidden, with the gap
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/No new detections in the last 3 hours/i)
    expect(notice).toHaveTextContent(/panels inactive/i)

    // Rotating through the available slides never surfaces NoActivity
    act(() => { vi.advanceTimersByTime(20_000) }); act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(20_000) }); act(() => { vi.advanceTimersByTime(500) })
    expect(screen.queryByText('NoActivity')).not.toBeInTheDocument()
  })

  it('shows no "panels hidden" notice when every slide has data', () => {
    render(<HeroRotator {...props} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('skips Top30Days slide when history has no 30-day data', () => {
    render(<HeroRotator {...props} history={{ ...props.history, top30Days: [] }} />)
    // slides: last → profile → today → rare (top30 excluded)
    act(() => { vi.advanceTimersByTime(20_000) }); act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(20_000) }); act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(20_000) }); act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByText('RareVisitors')).toBeInTheDocument()
  })
})
