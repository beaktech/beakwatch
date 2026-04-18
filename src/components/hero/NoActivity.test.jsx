import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import NoActivity from './NoActivity.jsx'

describe('NoActivity', () => {
  it('renders the resting copy', () => {
    render(<NoActivity />)
    expect(screen.getByText(/The birds are resting/)).toBeInTheDocument()
    expect(screen.getByText(/Check back at dusk/)).toBeInTheDocument()
  })
})
