import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Top30Days from './Top30Days.jsx'

const species = [
  { commonName: 'Eurasian Wren', count: 200 },
  { commonName: 'Robin', count: 150 },
]

describe('Top30Days', () => {
  it('renders heading', () => {
    render(<Top30Days species={species} />)
    expect(screen.getByText(/Top Species/i)).toBeInTheDocument()
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
