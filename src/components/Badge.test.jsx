import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from './Badge.jsx'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Hello</Badge>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies the dark variant classes by default', () => {
    render(<Badge>Hi</Badge>)
    expect(screen.getByText('Hi').className).toMatch(/uppercase/)
  })

  it('applies the light variant when requested', () => {
    render(<Badge variant="light">Hi</Badge>)
    expect(screen.getByText('Hi').className).toMatch(/bg-white\/20/)
  })

  it('merges a custom className', () => {
    render(<Badge className="extra-class">Hi</Badge>)
    expect(screen.getByText('Hi').className).toMatch(/extra-class/)
  })
})
