import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostTypeToggle } from './PostTypeToggle'

function Wrapper({ defaultType = 'OFFER' }: { defaultType?: string }) {
  const { control } = useForm<Record<string, any>>({
    defaultValues: { postType: defaultType },
  })
  return <PostTypeToggle control={control} />
}

describe('PostTypeToggle', () => {
  it('renders both options', () => {
    render(<Wrapper />)
    expect(screen.getByText('Offering Service')).toBeInTheDocument()
    expect(screen.getByText('Requesting Service')).toBeInTheDocument()
  })

  it('reflects the default value', () => {
    render(<Wrapper defaultType="REQUEST" />)
    expect(screen.getByText('Requesting Service').closest('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
