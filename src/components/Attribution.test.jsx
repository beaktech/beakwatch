import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../utils/wikipedia.js', () => ({
  fetchAttribution: vi.fn((name) => {
    if (name === 'Eurasian Wren') return Promise.resolve({ artist: 'Jane Photographer', license: 'CC BY-SA 4.0' })
    if (name === 'License Only') return Promise.resolve({ artist: null, license: 'CC BY 2.0' })
    if (name === 'Artist Only') return Promise.resolve({ artist: 'Someone', license: null })
    return Promise.resolve(null)
  }),
}))

import Attribution from './Attribution.jsx'

describe('Attribution', () => {
  it('renders artist / license when both are present', async () => {
    await act(async () => {
      render(<Attribution commonName="Eurasian Wren" />)
    })
    expect(screen.getByText('Jane Photographer / CC BY-SA 4.0')).toBeInTheDocument()
  })

  it('renders license only when artist is missing', async () => {
    await act(async () => {
      render(<Attribution commonName="License Only" />)
    })
    expect(screen.getByText('CC BY 2.0')).toBeInTheDocument()
  })

  it('renders nothing when attribution is null', async () => {
    const { container } = render(<Attribution commonName="Unknown" />)
    await act(async () => {})
    expect(container.textContent).toBe('')
  })
})
