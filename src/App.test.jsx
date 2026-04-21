import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('./hooks/useDetections.js', () => ({
  useDetections: () => ({
    detections: [
      { commonName: 'Eurasian Wren', timestamp: new Date().toISOString(), confidence: 0.9 },
      { commonName: 'Robin', timestamp: new Date().toISOString(), confidence: 0.8 },
    ],
    lastSuccessAt: Date.now(),
  }),
}))
vi.mock('./hooks/useTodayStats.js', () => ({
  useTodayStats: () => ({ todayStats: [{ commonName: 'Eurasian Wren', hour: 8, count: 5 }] }),
}))
vi.mock('./hooks/useHistory.js', () => ({
  useHistory: () => ({
    history: {
      top30Days: [{ commonName: 'Eurasian Wren', count: 100 }],
      rareVisitors: [{ commonName: 'Hawfinch', allTimeCount: 1 }],
      speciesLast30Days: 50,
      speciesAllTime: 124,
      newThisWeek: 3,
    },
  }),
}))
vi.mock('./utils/wikipedia.js', () => ({
  fetchWikipedia: vi.fn().mockResolvedValue({ extract: 'A tiny bird.', photoUrl: null, attribution: null }),
  fetchAttribution: vi.fn().mockResolvedValue(null),
}))
vi.mock('./hooks/useServer.js', () => ({
  useServer: () => ({ serverInfo: null, switchServer: vi.fn() }),
}))

import App from './App.jsx'

describe('App', () => {
  it('renders the sidebar', async () => {
    await act(async () => { render(<App />) })
    expect(screen.getByText('Recent sightings')).toBeInTheDocument()
  })

  it('renders the stats bar', async () => {
    await act(async () => { render(<App />) })
    expect(screen.getByText(/species today/)).toBeInTheDocument()
  })
})
