import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn(),
}))

import { fetchWikipedia } from '../utils/wikipedia.js'
import BirdImage from './BirdImage.jsx'

describe('BirdImage', () => {
  beforeEach(() => {
    fetchWikipedia.mockResolvedValue({ photoUrl: 'https://example.com/wiki-wren.jpg', extract: null })
  })

  it('renders a local image src by default', async () => {
    await act(async () => {
      render(<BirdImage commonName="Eurasian Wren" alt="Eurasian Wren" />)
    })
    const img = screen.getByRole('img')
    expect(img.src).toContain('/birds/eurasian-wren')
  })

  it('falls back to Wikipedia photo on local image error', async () => {
    await act(async () => {
      render(<BirdImage commonName="Eurasian Wren" alt="Eurasian Wren" />)
    })
    const img = screen.getByRole('img')
    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(img.src).toBe('https://example.com/wiki-wren.jpg')
  })

  it('shows placeholder when Wikipedia returns no photo', async () => {
    fetchWikipedia.mockResolvedValue({ photoUrl: null, extract: null })
    await act(async () => {
      render(<BirdImage commonName="Unknown Bird" alt="Unknown Bird" />)
    })
    const img = screen.getByRole('img')
    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(img.src).toContain('placeholder')
  })
})
