import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { LocationField } from './LocationField'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [] })),
  }
})

vi.mock('#/lib/queries/profiles', () => ({
  profileLocationsQueryOptions: vi.fn(() => ({ queryKey: ['locations'], queryFn: async () => [] })),
}))

function Wrapper({ isManualLocation = false, onToggle = vi.fn() }) {
  const { control } = useForm<Record<string, any>>({
    defaultValues: {
      locationId: '',
      country: '',
      region: '',
      city: '',
      street: '',
      houseNumber: '',
    },
  })
  return (
    <LocationField
      control={control}
      profileId="profile-1"
      isManualLocation={isManualLocation}
      onToggle={onToggle}
    />
  )
}

describe('LocationField', () => {
  it('renders the location select in default (non-manual) mode', () => {
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

  it('renders manual location fields when isManualLocation=true', () => {
    render(<Wrapper isManualLocation={true} />)
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
  })

  it('renders the "Use Previous Location" button when in manual mode', () => {
    render(<Wrapper isManualLocation={true} />)
    expect(screen.getByRole('button', { name: /use previous location/i })).toBeInTheDocument()
  })

  it('renders region, street, and house number fields in manual mode', () => {
    render(<Wrapper isManualLocation={true} />)
    expect(screen.getByLabelText(/region/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/street/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/house number/i)).toBeInTheDocument()
  })
})
