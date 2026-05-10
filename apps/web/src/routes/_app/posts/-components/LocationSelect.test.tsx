import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseSearch = vi.hoisted(() => vi.fn())
const mockUseNavigate = vi.hoisted(() => vi.fn())

// Route is imported directly from '../index' by LocationSelect — mock that module
vi.mock('../index', () => ({
  Route: {
    useSearch: mockUseSearch,
    useNavigate: mockUseNavigate,
  },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isFetching: false })),
  }
})

// ── Import component after mocks ──────────────────────────────────────────────

import { LocationSelect } from './LocationSelect'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LocationSelect', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ country: undefined, region: undefined, city: undefined })
    mockUseNavigate.mockReturnValue(vi.fn())
  })

  it('renders "All Locations" label when no filter is active', () => {
    render(<LocationSelect />)
    expect(screen.getByText('All Locations')).toBeInTheDocument()
  })

  it('renders the city label when city search param is set', () => {
    mockUseSearch.mockReturnValue({
      country: 'Slovakia',
      region: 'Bratislava Region',
      city: 'Bratislava',
    })
    render(<LocationSelect />)
    expect(screen.getByText('Bratislava')).toBeInTheDocument()
  })

  it('renders the country label when only country is set', () => {
    mockUseSearch.mockReturnValue({ country: 'Slovakia', region: undefined, city: undefined })
    render(<LocationSelect />)
    expect(screen.getByText('Slovakia')).toBeInTheDocument()
  })

  it('renders the region label when country and region are set but not city', () => {
    mockUseSearch.mockReturnValue({
      country: 'Slovakia',
      region: 'Bratislava Region',
      city: undefined,
    })
    render(<LocationSelect />)
    expect(screen.getByText('Bratislava Region')).toBeInTheDocument()
  })
})
