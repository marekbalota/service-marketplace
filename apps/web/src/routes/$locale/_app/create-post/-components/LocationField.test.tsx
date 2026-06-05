import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { LocationField } from './LocationField'

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

function Wrapper({ isNewLocation = false, onToggle = vi.fn() }) {
  const { control } = useForm<Record<string, string>>({
    defaultValues: {
      locationId: '',
      locationExternalId: '',
    },
  })
  return (
    <LocationField
      control={control}
      profileId="profile-1"
      isNewLocation={isNewLocation}
      onToggle={onToggle}
    />
  )
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

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn()
    render(<Wrapper onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /enter new location/i }))
    expect(onToggle).toHaveBeenCalled()
  })

  it('renders the LocationAutocomplete combobox when isNewLocation=true', () => {
    render(<Wrapper isNewLocation={true} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders the "Use Previous Location" button when in new-location mode', () => {
    render(<Wrapper isNewLocation={true} />)
    expect(screen.getByRole('button', { name: /use previous location/i })).toBeInTheDocument()
  })
})
