import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatsBar from './StatsBar.jsx'

const todayStats = [
  { commonName: 'Wren' },
  { commonName: 'Robin' },
  { commonName: 'Wren' },
]

const history = {
  speciesLast30Days: 50,
  speciesAllTime: 124,
  newThisWeek: 3,
}

// Text is split across nested spans; use textContent check on the footer
function statText(container) {
  return container.querySelector('footer').textContent.replace(/\s+/g, ' ').trim()
}

describe('StatsBar', () => {
  it('shows count of distinct species today', () => {
    const { container } = render(<StatsBar todayStats={todayStats} history={history} />)
    expect(statText(container)).toMatch(/2 species today/)
  })

  it('shows last-30-day species count from history', () => {
    const { container } = render(<StatsBar todayStats={todayStats} history={history} />)
    expect(statText(container)).toMatch(/50 in last 30 days/)
  })

  it('shows all-time species count', () => {
    const { container } = render(<StatsBar todayStats={todayStats} history={history} />)
    expect(statText(container)).toMatch(/124 ever/)
  })

  it('shows new-this-week count', () => {
    const { container } = render(<StatsBar todayStats={todayStats} history={history} />)
    expect(statText(container)).toMatch(/3 new this week/)
  })

  it('renders dashes when data is not yet loaded', () => {
    render(<StatsBar todayStats={[]} history={null} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
