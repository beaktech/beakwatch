import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))
vi.mock('../../hooks/useAttribution.js', () => ({
  useAttribution: () => null,
}))

import Top30Days from './Top30Days.jsx'

const species = [
  { commonName: 'Eurasian Wren', count: 200 },
  { commonName: 'Robin', count: 150 },
]

describe('Top30Days', () => {
  it('renders heading', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText(/Most Popular Species/i)).toBeInTheDocument()
  })

  it('renders species names with counts', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText('Eurasian Wren')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows rank numbers', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
