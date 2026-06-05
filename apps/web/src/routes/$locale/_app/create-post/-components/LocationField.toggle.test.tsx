import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LocationField } from './LocationField'
import type { LocationSuggestion } from '#/components/LocationAutocomplete'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn(() => ({ data: [], isFetching: false })) }
})

vi.mock('#/lib/queries/profiles', () => ({
  profileLocationsQueryOptions: vi.fn(() => ({ queryKey: ['loc'], queryFn: async () => [] })),
}))

vi.mock('#/lib/queries/locations', () => ({
  locationAutocompleteQueryOptions: vi.fn(() => ({
    queryKey: ['loc-auto'],
    queryFn: async () => [],
    enabled: false,
    staleTime: 0,
  })),
}))

vi.mock('#/lib/useLocale', () => ({ useLocale: () => 'en' }))

vi.mock('#/components/LocationAutocomplete', () => ({
  LocationAutocomplete: ({
    value,
    onChange,
  }: {
    value: LocationSuggestion | null
    onChange: (s: LocationSuggestion | null) => void
  }) => (
    <div>
      <input role="combobox" readOnly value={value?.city ?? ''} onChange={() => {}} />
      <button
        type="button"
        onClick={() =>
          onChange({ id: 'R1', city: 'TestCity', region: null, country: 'TestCountry', street: null })
        }
      >
        pick-location
      </button>
    </div>
  ),
}))

function ToggleWrapper() {
  const [isNewLocation, setIsNewLocation] = useState(true)
  const { control, setValue } = useForm<Record<string, string>>({
    defaultValues: { locationId: '', locationExternalId: '' },
  })
  return (
    <LocationField
      control={control}
      profileId="profile-1"
      isNewLocation={isNewLocation}
      onToggle={() => {
        setIsNewLocation((prev) => !prev)
        setValue('locationExternalId', '')
      }}
    />
  )
}

describe('LocationField — toggle resets selection', () => {
  it('clears the selected suggestion when switching from new-location to previous-location mode', () => {
    render(<ToggleWrapper />)

    // Simulate selecting a location via the mock button
    fireEvent.click(screen.getByRole('button', { name: 'pick-location' }))
    expect(screen.getByRole('combobox')).toHaveValue('TestCity')

    // Toggle to previous-location mode (onToggle → isNewLocation=false)
    fireEvent.click(screen.getByRole('button', { name: /use previous location/i }))

    // Toggle back to new-location mode (onToggle → isNewLocation=true)
    fireEvent.click(screen.getByRole('button', { name: /enter new location/i }))

    // The autocomplete input must be empty — selectedLocation was reset on toggle
    expect(screen.getByRole('combobox')).toHaveValue('')
  })
})
