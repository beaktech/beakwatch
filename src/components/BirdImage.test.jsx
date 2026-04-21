import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import BirdImage from './BirdImage.jsx'

describe('BirdImage', () => {
  it('requests the cached server image with name and width', () => {
    render(<BirdImage commonName="Eurasian Wren" alt="Eurasian Wren" width={80} />)
    const img = screen.getByRole('img')
    expect(img.src).toContain('/birds/eurasian-wren.jpg')
    expect(img.src).toContain('name=Eurasian%20Wren')
    expect(img.src).toMatch(/w=\d+/)
  })

  it('falls back to placeholder when the image fails to load', async () => {
    render(<BirdImage commonName="Unknown Bird" alt="Unknown Bird" />)
    const img = screen.getByRole('img')
    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(img.src).toContain('placeholder')
  })
})
