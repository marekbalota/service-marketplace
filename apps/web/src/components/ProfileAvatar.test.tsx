import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProfileAvatar } from './ProfileAvatar'

describe('ProfileAvatar', () => {
  it('renders initials when no imageUrl is provided', () => {
    render(<ProfileAvatar name="Super Admin" />)
    expect(screen.getByText('SA')).toBeInTheDocument()
  })

  it('renders an img element when imageUrl is provided', () => {
    render(<ProfileAvatar name="Super Admin" imageUrl="https://example.com/avatar.jpg" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(img).toHaveAttribute('alt', 'Super Admin')
  })

  it('still renders fallback element even with imageUrl (for broken image fallback)', () => {
    render(<ProfileAvatar name="Super Admin" imageUrl="https://example.com/avatar.jpg" />)
    expect(screen.getByText('SA')).toBeInTheDocument()
  })
})
