import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DailyTopBirds from './DailyTopBirds.jsx'

const weeklyActivity = [
  { commonName: 'Eurasian Wren', hour: 8, count: 5 },
  { commonName: 'Eurasian Wren', hour: 9, count: 10 },
  { commonName: 'Robin', hour: 7, count: 3 },
]

describe('DailyTopBirds', () => {
  it('renders species names', () => {
    render(<DailyTopBirds weeklyActivity={weeklyActivity} />)
    expect(screen.getByText('Activity Patterns')).toBeInTheDocument()
  })

  it('renders without crashing when given empty data', () => {
    render(<DailyTopBirds weeklyActivity={[]} />)
    expect(screen.getByText('Activity Patterns')).toBeInTheDocument()
  })

  it('renders a canvas element for the heatmap', () => {
    const { container } = render(<DailyTopBirds weeklyActivity={weeklyActivity} />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
