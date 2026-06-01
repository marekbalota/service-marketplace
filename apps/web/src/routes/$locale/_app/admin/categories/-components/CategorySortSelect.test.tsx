import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategorySortSelect } from './CategorySortSelect'

const mockNavigate = vi.fn()
const mockUseSearch = vi.fn()

vi.mock('../route', () => ({
  Route: {
    useNavigate: () => mockNavigate,
    useSearch: () => mockUseSearch(),
  },
  SORT_BY_VALUES: ['name', 'activePosts', 'archivedPosts', 'totalPosts'],
  SORT_ORDER_VALUES: ['asc', 'desc'],
}))

describe('CategorySortSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
  })

  it('renders the trigger button', () => {
    render(<CategorySortSelect />)
    expect(screen.getAllByRole('button')[0]).toBeInTheDocument()
  })

  it('shows default sort label when no sort is active', () => {
    render(<CategorySortSelect />)
    expect(screen.getAllByRole('button')[0]!.textContent).toMatch(/Name/i)
  })

  it('opens the popover when trigger is clicked', () => {
    render(<CategorySortSelect />)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(screen.getByText(/Ascending/i)).toBeInTheDocument()
    expect(screen.getByText(/Descending/i)).toBeInTheDocument()
  })

  it('navigates with sortBy=activePosts when that option is selected', async () => {
    const user = userEvent.setup()
    render(<CategorySortSelect />)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(/Active posts/i))
    const updater = (
      mockNavigate.mock.calls[0] as [
        { search: (p: Record<string, unknown>) => Record<string, unknown> },
      ]
    )[0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
    expect(result.sortBy).toBe('activePosts')
    expect(result.page).toBeUndefined()
  })

  it('navigates with sortBy=undefined when Name option is selected', async () => {
    mockUseSearch.mockReturnValue({
      q: '',
      page: undefined,
      sortBy: 'activePosts',
      sortOrder: undefined,
      translationFilter: undefined,
    })
    const user = userEvent.setup()
    render(<CategorySortSelect />)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(/^Name$/i))
    const updater = (
      mockNavigate.mock.calls[0] as [
        { search: (p: Record<string, unknown>) => Record<string, unknown> },
      ]
    )[0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: 'activePosts',
      sortOrder: undefined,
      translationFilter: undefined,
    })
    expect(result.sortBy).toBeUndefined()
    expect(result.page).toBeUndefined()
  })

  it('navigates with sortOrder=desc when Descending is clicked', () => {
    render(<CategorySortSelect />)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    fireEvent.click(screen.getByText(/Descending/i))
    const updater = (
      mockNavigate.mock.calls[0] as [
        { search: (p: Record<string, unknown>) => Record<string, unknown> },
      ]
    )[0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
    expect(result.sortOrder).toBe('desc')
    expect(result.page).toBeUndefined()
  })
})
