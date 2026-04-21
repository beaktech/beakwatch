import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../BirdImage.jsx', () => ({
  default: ({ alt }) => <img alt={alt} />,
}))

import RareVisitors from './RareVisitors.jsx'

const species = [
  { commonName: 'Hawfinch', allTimeCount: 1 },
  { commonName: 'Firecrest', allTimeCount: 2 },
]

describe('RareVisitors', () => {
  it('renders heading', () => {
    render(<RareVisitors species={species} />)
    expect(screen.getByText(/Rare Visitors/i)).toBeInTheDocument()
  })

  it('renders rare species with their counts', () => {
    render(<RareVisitors species={species} />)
    expect(screen.getByText('Hawfinch')).toBeInTheDocument()
    expect(screen.getByText('1 detection ever')).toBeInTheDocument()
  })
})
