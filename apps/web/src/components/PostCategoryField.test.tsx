import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostCategoryField } from './PostCategoryField'

const categories = [
  { categoryId: 'cat-1', name: 'Plumbing' },
  { categoryId: 'cat-2', name: 'Tutoring' },
]

function Wrapper() {
  const { control } = useForm<Record<string, any>>({
    defaultValues: { categoryIds: [] },
  })
  return <PostCategoryField control={control} categories={categories} />
}

describe('PostCategoryField', () => {
  it('renders the category label', () => {
    render(<Wrapper />)
    expect(screen.getByText(/categories/i)).toBeInTheDocument()
  })

  it('renders the hint text', () => {
    render(<Wrapper />)
    expect(screen.getByText(/help people find your post/i)).toBeInTheDocument()
  })
})
