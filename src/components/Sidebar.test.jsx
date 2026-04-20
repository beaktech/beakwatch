import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('./BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: () => null,
}))
vi.mock('../hooks/useServer.js', () => ({
  useServer: () => ({ serverInfo: null, switchServer: vi.fn() }),
}))

import Sidebar from './Sidebar.jsx'

const detections = [
  { commonName: 'Eurasian Wren', timestamp: new Date(Date.now() - 120_000).toISOString(), confidence: 0.9 },
  { commonName: 'Robin', timestamp: new Date(Date.now() - 300_000).toISOString(), confidence: 0.8 },
]

describe('Sidebar', () => {
  it('renders "Recent sightings" heading', () => {
    render(<Sidebar detections={detections} todayStats={[]} />)
    expect(screen.getByText('Recent sightings')).toBeInTheDocument()
  })

  it('renders a card for each detection', () => {
    render(<Sidebar detections={detections} todayStats={[]} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('Robin')).toBeInTheDocument()
  })

  it('shows relative timestamp on each card', () => {
    render(<Sidebar detections={detections} todayStats={[]} />)
    expect(screen.getByText('2 mins ago')).toBeInTheDocument()
  })

  it('renders LIVE indicator', () => {
    render(<Sidebar detections={detections} todayStats={[]} />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
})
