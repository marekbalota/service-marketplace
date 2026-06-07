import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocationAutocomplete } from './LocationAutocomplete'
import * as apiModule from '#/api'

vi.mock('@tanstack/react-pacer', () => ({
  useDebouncedValue: (v: unknown) => [v],
}))

vi.mock('#/api', () => ({
  api: {
    locations: {
      autocomplete: {
        get: vi.fn(),
      },
    },
  },
}))

const mockSuggestion = {
  id: 'R86674',
  city: 'Brno',
  region: 'South Moravian Region',
  country: 'Czech Republic',
  street: null,
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('LocationAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiModule.api.locations.autocomplete.get).mockResolvedValue({
      data: { suggestions: [mockSuggestion] },
      error: null,
    } as never)
  })

  it('shows suggestions when user types 3+ chars', async () => {
    const onChange = vi.fn()
    render(<LocationAutocomplete value={null} onChange={onChange} />, { wrapper })

    await userEvent.type(screen.getByRole('combobox'), 'Brno')
    await waitFor(() =>
      expect(screen.getByText('Brno, South Moravian Region, Czech Republic')).toBeInTheDocument(),
    )
  })

  it('calls onChange with suggestion on selection', async () => {
    const onChange = vi.fn()
    render(<LocationAutocomplete value={null} onChange={onChange} />, { wrapper })

    await userEvent.type(screen.getByRole('combobox'), 'Brno')
    await waitFor(() => screen.getByText('Brno, South Moravian Region, Czech Republic'))
    await userEvent.click(screen.getByText('Brno, South Moravian Region, Czech Republic'))

    expect(onChange).toHaveBeenCalledWith(mockSuggestion)
  })

  it('shows selected value display name', () => {
    render(<LocationAutocomplete value={mockSuggestion} onChange={vi.fn()} />, { wrapper })
    // getByRole excludes aria-hidden elements so it finds only the visible combobox input
    expect(screen.getByRole('combobox')).toHaveValue('Brno, South Moravian Region, Czech Republic')
  })

  it('calls onChange(null) when clear button clicked', async () => {
    const onChange = vi.fn()
    render(<LocationAutocomplete value={mockSuggestion} onChange={onChange} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('does not fire query for input shorter than 3 chars', async () => {
    render(<LocationAutocomplete value={null} onChange={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByRole('combobox'), 'Br')
    expect(apiModule.api.locations.autocomplete.get).not.toHaveBeenCalled()
  })
})
