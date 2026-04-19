import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../hooks/useAttribution.js', () => ({
  useAttribution: vi.fn((name) => {
    if (name === 'Eurasian Wren') return { artist: 'Jane Photographer', license: 'CC BY-SA 4.0' }
    if (name === 'No Data') return null
    return null
  }),
}))

import AttributionTooltip from './AttributionTooltip.jsx'

describe('AttributionTooltip', () => {
  it('renders children unchanged', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    expect(screen.getByAltText('Eurasian Wren')).toBeInTheDocument()
  })

  it('renders the tooltip text when attribution data is available', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    expect(screen.getByText('© Jane Photographer / CC BY-SA 4.0')).toBeInTheDocument()
  })

  it('omits the tooltip when no attribution data is available', () => {
    render(
      <AttributionTooltip commonName="No Data">
        <img alt="No Data" />
      </AttributionTooltip>
    )
    expect(screen.queryByText(/©/)).toBeNull()
  })

  it('wraps children in a group-hover container so CSS reveal works', () => {
    const { container } = render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    const wrapper = container.firstChild
    expect(wrapper.className).toMatch(/group/)
    expect(wrapper.className).toMatch(/relative/)
  })

  it('tooltip uses opacity-0 by default and reveals via group-hover', () => {
    render(
      <AttributionTooltip commonName="Eurasian Wren">
        <img alt="Eurasian Wren" />
      </AttributionTooltip>
    )
    const tooltip = screen.getByText('© Jane Photographer / CC BY-SA 4.0')
    expect(tooltip.className).toMatch(/opacity-0/)
    expect(tooltip.className).toMatch(/group-hover:opacity-100/)
  })
})
