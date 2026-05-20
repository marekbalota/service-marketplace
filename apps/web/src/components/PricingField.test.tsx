import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { PricingField } from './PricingField'

function Wrapper({ priceValue = '' }: { priceValue?: string }) {
  const { control } = useForm<Record<string, any>>({
    defaultValues: { price: priceValue, rateType: '' },
  })
  return <PricingField control={control} priceValue={priceValue} />
}

describe('PricingField', () => {
  it('renders the price input', () => {
    render(<Wrapper />)
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
  })

  it('renders the rate type select', () => {
    render(<Wrapper />)
    expect(screen.getAllByText(/rate type/i).length).toBeGreaterThan(0)
  })

  it('disables the rate type select when price is empty', () => {
    render(<Wrapper priceValue="" />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('enables the rate type select when price is provided', () => {
    render(<Wrapper priceValue="50" />)
    expect(screen.getByRole('combobox')).not.toBeDisabled()
  })
})
