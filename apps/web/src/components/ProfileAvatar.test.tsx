import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProfileAvatar } from './ProfileAvatar'

// @base-ui/react/avatar defers image rendering until the onLoad event fires,
// which never happens in JSDOM. Mock it to render eagerly.
vi.mock('@base-ui/react/avatar', () => ({
  Avatar: {
    Root: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
    Image: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img src={src} alt={alt} {...props} />,
    Fallback: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  },
}))

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
