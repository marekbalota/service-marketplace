import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ImageLightbox } from './ImageLightbox'

const images = [
  { src: 'http://example.com/a.jpg', alt: 'Image A' },
  { src: 'http://example.com/b.jpg', alt: 'Image B' },
  { src: 'http://example.com/c.jpg', alt: 'Image C' },
]

describe('ImageLightbox', () => {
  it('does not render when open is false', () => {
    render(<ImageLightbox images={images} open={false} onClose={vi.fn()} />)
    expect(screen.queryByAltText('Image A')).not.toBeInTheDocument()
  })

  it('renders the initial image when open', () => {
    render(<ImageLightbox images={images} initialIndex={0} open onClose={vi.fn()} />)
    expect(screen.getByAltText('Image A')).toBeInTheDocument()
  })

  it('opens at the correct initialIndex', () => {
    render(<ImageLightbox images={images} initialIndex={1} open onClose={vi.fn()} />)
    expect(screen.getByAltText('Image B')).toBeInTheDocument()
  })

  it('shows prev/next buttons when multiple images', () => {
    render(<ImageLightbox images={images} open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('hides prev/next buttons for a single image', () => {
    render(<ImageLightbox images={[images[0]!]} open onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('advances to next image when next button is clicked', () => {
    render(<ImageLightbox images={images} initialIndex={0} open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByAltText('Image B')).toBeInTheDocument()
  })

  it('goes to previous image when prev button is clicked', () => {
    render(<ImageLightbox images={images} initialIndex={1} open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByAltText('Image A')).toBeInTheDocument()
  })

  it('shows image counter when multiple images', () => {
    render(<ImageLightbox images={images} initialIndex={1} open onClose={vi.fn()} />)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('hides counter for a single image', () => {
    render(<ImageLightbox images={[images[0]!]} open onClose={vi.fn()} />)
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('wraps from last image to first on next', () => {
    render(<ImageLightbox images={images} initialIndex={2} open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByAltText('Image A')).toBeInTheDocument()
  })

  it('wraps from first image to last on prev', () => {
    render(<ImageLightbox images={images} initialIndex={0} open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByAltText('Image C')).toBeInTheDocument()
  })
})
