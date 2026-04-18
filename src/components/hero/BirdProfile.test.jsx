import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({ default: ({ alt }) => <img alt={alt} /> }))
vi.mock('../../utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue({ extract: 'A small passerine bird.', photoUrl: null, attribution: null }),
  fetchAttribution: vi.fn().mockResolvedValue(null),
}))

import BirdProfile from './BirdProfile.jsx'

const detection = {
  commonName: 'Eurasian Wren',
  scientificName: 'Troglodytes troglodytes',
  confidence: 0.95,
  timestamp: new Date().toISOString(),
}

const todayStats = [
  { commonName: 'Eurasian Wren', hour: 8, count: 3 },
  { commonName: 'Eurasian Wren', hour: 9, count: 7 },
  { commonName: 'Robin', hour: 8, count: 2 },
]

describe('BirdProfile', () => {
  it('renders the species name and scientific name', () => {
    render(<BirdProfile detection={detection} todayStats={todayStats} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('Troglodytes troglodytes')).toBeInTheDocument()
  })

  it('renders the Species Profile badge', () => {
    render(<BirdProfile detection={detection} todayStats={todayStats} />)
    expect(screen.getByText('Species Profile')).toBeInTheDocument()
  })

  it('renders today total and peak hour stats', () => {
    render(<BirdProfile detection={detection} todayStats={todayStats} />)
    expect(screen.getByText('10')).toBeInTheDocument() // 3 + 7
    expect(screen.getByText('detections today')).toBeInTheDocument()
    expect(screen.getByText('9:00')).toBeInTheDocument() // peak hour
  })

  it('renders without crashing when todayStats is empty', () => {
    render(<BirdProfile detection={detection} todayStats={[]} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
  })
})
