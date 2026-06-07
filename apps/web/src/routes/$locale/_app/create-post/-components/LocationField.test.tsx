import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { LocationField } from './LocationField'

vi.mock('@tanstack/react-pacer', () => ({
  useDebouncedValue: (v: unknown) => [v],
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isFetching: false })),
  }
})

vi.mock('#/lib/queries/profiles', () => ({
  profileLocationsQueryOptions: vi.fn(() => ({ queryKey: ['locations'], queryFn: async () => [] })),
}))

vi.mock('#/lib/queries/locations', () => ({
  locationAutocompleteQueryOptions: vi.fn(() => ({
    queryKey: ['locations-autocomplete'],
    queryFn: async () => [],
    enabled: false,
    staleTime: 0,
  })),
}))

vi.mock('#/lib/useLocale', () => ({ useLocale: () => 'en' }))

function Wrapper() {
  const { control } = useForm<Record<string, string>>({
    defaultValues: {
      locationId: '',
      locationExternalId: '',
    },
  })
  return <LocationField control={control} profileId="profile-1" />
}

describe('LocationField', () => {
  it('renders the location select in default (non-new) mode', () => {
    render(<Wrapper />)
    expect(screen.getByText(/select from your previous locations/i)).toBeInTheDocument()
  })

  it('renders the "Enter New Location" toggle button', () => {
    render(<Wrapper />)
    expect(screen.getByRole('button', { name: /enter new location/i })).toBeInTheDocument()
  })

  it('clicking the toggle button switches to new-location mode', () => {
    render(<Wrapper />)
    fireEvent.click(screen.getByRole('button', { name: /enter new location/i }))
    expect(screen.getByRole('button', { name: /use previous location/i })).toBeInTheDocument()
  })

  it('renders the LocationAutocomplete combobox in default mode', () => {
    render(<Wrapper />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders the "Use Previous Location" button after clicking Enter New Location', () => {
    render(<Wrapper />)
    fireEvent.click(screen.getByRole('button', { name: /enter new location/i }))
    expect(screen.getByRole('button', { name: /use previous location/i })).toBeInTheDocument()
  })
})
