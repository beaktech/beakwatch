import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../../utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue({
    extract: 'A tiny brown bird.',
    photoUrl: null,
  }),
}))

import LastIdentified from './LastIdentified.jsx'

const detection = {
  commonName: 'Eurasian Wren',
  scientificName: 'Troglodytes troglodytes',
  timestamp: new Date().toISOString(),
}

describe('LastIdentified', () => {
  it('shows the common name of the most recent detection', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={false} todayCount={null} />)
    })
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
  })

  it('shows the Wikipedia fun fact', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={false} todayCount={null} />)
    })
    expect(screen.getByText('A tiny brown bird.')).toBeInTheDocument()
  })

  it('shows Species Spotlight variant when isSpotlight is true', async () => {
    await act(async () => {
      render(<LastIdentified detection={detection} isSpotlight={true} todayCount={42} />)
    })
    expect(screen.getByText('Species Spotlight')).toBeInTheDocument()
    expect(screen.getByText(/42 detections today/)).toBeInTheDocument()
  })
})
