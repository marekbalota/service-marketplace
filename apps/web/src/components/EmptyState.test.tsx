import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders children when provided', () => {
    render(
      <EmptyState message="Nothing here.">
        <button>Create one</button>
      </EmptyState>,
    )
    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument()
  })
})
