import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostDescriptionField } from './PostDescriptionField'

function Wrapper() {
  const { control } = useForm<Record<string, any>>({
    defaultValues: { description: '' },
  })
  return <PostDescriptionField control={control} />
}

describe('PostDescriptionField', () => {
  it('renders a textarea', () => {
    render(<Wrapper />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the description label', () => {
    render(<Wrapper />)
    expect(screen.getByText(/description/i)).toBeInTheDocument()
  })

  it('renders the hint text', () => {
    render(<Wrapper />)
    expect(screen.getByText(/the more details/i)).toBeInTheDocument()
  })
})
