import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddLocationDialog } from './AddLocationDialog'
import type { LocationSuggestion } from '#/components/LocationAutocomplete'

vi.mock('#/components/LocationAutocomplete', () => ({
  LocationAutocomplete: ({
    value,
    onChange,
  }: {
    value: LocationSuggestion | null
    onChange: (s: LocationSuggestion | null) => void
  }) => (
    <div>
      <input
        role="combobox"
        readOnly
        placeholder="Search for a location…"
        value={value ? `${value.city}, ${value.country}` : ''}
        onChange={() => {}}
      />
      <button
        type="button"
        onClick={() =>
          onChange({ id: 'R1', city: 'Brno', region: 'South Moravia', country: 'Czech Republic', street: null })
        }
      >
        select-brno
      </button>
    </div>
  ),
}))

describe('AddLocationDialog', () => {
  it('renders dialog content when open', () => {
    render(
      <AddLocationDialog open={true} onClose={vi.fn()} onSave={vi.fn()} isPending={false} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('save button is disabled when no location is selected', () => {
    render(
      <AddLocationDialog open={true} onClose={vi.fn()} onSave={vi.fn()} isPending={false} />,
    )
    expect(screen.getByRole('button', { name: /add location/i })).toBeDisabled()
  })

  it('save button is enabled after selecting a location', () => {
    render(
      <AddLocationDialog open={true} onClose={vi.fn()} onSave={vi.fn()} isPending={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'select-brno' }))
    expect(screen.getByRole('button', { name: /add location/i })).not.toBeDisabled()
  })

  it('calls onSave with the selected suggestion when save is clicked', () => {
    const onSave = vi.fn()
    render(
      <AddLocationDialog open={true} onClose={vi.fn()} onSave={onSave} isPending={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'select-brno' }))
    fireEvent.click(screen.getByRole('button', { name: /add location/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Brno', country: 'Czech Republic' }),
    )
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <AddLocationDialog open={true} onClose={onClose} onSave={vi.fn()} isPending={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message when error prop is provided', () => {
    render(
      <AddLocationDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isPending={false}
        error="Something went wrong"
      />,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('disables save button while isPending is true', () => {
    render(
      <AddLocationDialog open={true} onClose={vi.fn()} onSave={vi.fn()} isPending={true} />,
    )
    expect(screen.getByRole('button', { name: /add location/i })).toBeDisabled()
  })
})
