import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostTitleField } from './PostTitleField'

function Wrapper() {
  const { control } = useForm<Record<string, any>>({
    defaultValues: { postTitle: '' },
  })
  return <PostTitleField control={control} />
}

describe('PostTitleField', () => {
  it('renders a text input', () => {
    render(<Wrapper />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the title label', () => {
    render(<Wrapper />)
    expect(screen.getByText(/title/i)).toBeInTheDocument()
  })

  it('renders the hint text', () => {
    render(<Wrapper />)
    expect(screen.getByText(/make it clear and specific/i)).toBeInTheDocument()
  })
})
