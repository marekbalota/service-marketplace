import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

const mockNavigate = vi.fn()
const mockUseSearch = vi.fn()

vi.doMock('../route', () => ({
  Route: {
    useNavigate: () => mockNavigate,
    useSearch: () => mockUseSearch(),
  },
  TRANSLATION_FILTER_VALUES: ['complete', 'incomplete', 'sk', 'cs'],
}))

let TranslationFilterSelect: typeof import('./TranslationFilterSelect').TranslationFilterSelect

beforeAll(async () => {
  TranslationFilterSelect = (await import('./TranslationFilterSelect')).TranslationFilterSelect
})

describe('TranslationFilterSelect', () => {
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

  it('renders the select trigger', () => {
    render(<TranslationFilterSelect />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows "All languages" when no filter is active', () => {
    render(<TranslationFilterSelect />)
    expect(screen.getByRole('combobox').textContent).toMatch(/All languages/i)
  })

  it('has options for complete, incomplete, and missing-{locale} for each supported locale', async () => {
    const user = userEvent.setup()
    render(<TranslationFilterSelect />)
    await user.click(screen.getByRole('combobox'))
    expect(await screen.findByText(/^Complete$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Incomplete$/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing SK/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing CS/i)).toBeInTheDocument()
  })

  it('navigates with translationFilter=complete when Complete is selected', async () => {
    const user = userEvent.setup()
    render(<TranslationFilterSelect />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(/^Complete$/i))
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: expect.any(Function) }),
    )
    const updater = mockNavigate.mock.calls[0]![0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
    expect(result.translationFilter).toBe('complete')
    expect(result.page).toBeUndefined()
  })

  it('navigates with translationFilter=sk when Missing SK is selected', async () => {
    const user = userEvent.setup()
    render(<TranslationFilterSelect />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(/Missing SK/i))
    const updater = mockNavigate.mock.calls[0]![0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
    expect(result.translationFilter).toBe('sk')
  })

  it('navigates with translationFilter=undefined when All is selected', async () => {
    mockUseSearch.mockReturnValue({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: 'complete',
    })
    const user = userEvent.setup()
    render(<TranslationFilterSelect />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(/All languages/i))
    const updater = mockNavigate.mock.calls[0]![0].search
    const result = updater({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: 'complete',
    })
    expect(result.translationFilter).toBeUndefined()
  })
})
