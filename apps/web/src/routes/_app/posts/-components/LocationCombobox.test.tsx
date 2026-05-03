import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LocationCombobox } from './LocationCombobox'

const options = ['USA', 'Slovakia', 'Germany', 'Trenčín']

describe('LocationCombobox', () => {
  it('renders the placeholder when value is undefined', () => {
    render(
      <LocationCombobox
        value={undefined}
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
      />,
    )
    expect(screen.getByText('Any country')).toBeInTheDocument()
  })

  it('renders the selected value when value is set', () => {
    render(
      <LocationCombobox
        value="USA"
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
      />,
    )
    expect(screen.getByText('USA')).toBeInTheDocument()
  })

  it('does not show the clear button when value is undefined', () => {
    render(
      <LocationCombobox
        value={undefined}
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
      />,
    )
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows the clear button when value is set and not disabled', () => {
    render(
      <LocationCombobox
        value="USA"
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
      />,
    )
    expect(screen.getByRole('button', { name: /clear any country/i })).toBeInTheDocument()
  })

  it('calls onChange(undefined) when the clear button is clicked', () => {
    const onChange = vi.fn()
    render(
      <LocationCombobox
        value="USA"
        onChange={onChange}
        options={options}
        placeholder="Any country"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /clear any country/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('does not show the clear button when disabled even if value is set', () => {
    render(
      <LocationCombobox
        value="USA"
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
        disabled
      />,
    )
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('applies data-disabled attribute when disabled', () => {
    render(
      <LocationCombobox
        value={undefined}
        onChange={vi.fn()}
        options={options}
        placeholder="Any country"
        disabled
      />,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('data-disabled')
  })
})
