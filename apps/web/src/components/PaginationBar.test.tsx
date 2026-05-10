// apps/web/src/components/PaginationBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PaginationBar } from './PaginationBar'

describe('PaginationBar', () => {
  it('renders page links for each visible page', () => {
    render(<PaginationBar page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /page 3/i })).toBeInTheDocument()
  })

  it('fires onPageChange with the correct page number when a page button is clicked', () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={1} totalPages={3} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: /page 2/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('fires onPageChange(page + 1) when the Next button is clicked', () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={2} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('link', { name: /go to next page/i }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('fires onPageChange(page - 1) when the Previous button is clicked', () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={3} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('link', { name: /go to previous page/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables/hides the Previous button on page 1', () => {
    render(<PaginationBar page={1} totalPages={5} onPageChange={vi.fn()} />)
    const prev = screen.getByRole('link', { name: /go to previous page/i })
    expect(prev).toHaveClass('pointer-events-none')
  })

  it('disables/hides the Next button on the last page', () => {
    render(<PaginationBar page={5} totalPages={5} onPageChange={vi.fn()} />)
    const next = screen.getByRole('link', { name: /go to next page/i })
    expect(next).toHaveClass('pointer-events-none')
  })

  it('shows an ellipsis when there is a gap in the page sequence', () => {
    render(<PaginationBar page={1} totalPages={10} onPageChange={vi.fn()} />)
    expect(
      screen
        .getAllByRole('generic')
        .some(
          (el) => el.textContent?.includes('…') || el.getAttribute('aria-label') === 'More pages',
        ),
    ).toBe(true)
  })

  it('does not render page buttons for middle pages when gap exists', () => {
    render(<PaginationBar page={1} totalPages={10} onPageChange={vi.fn()} />)
    // page 5 should not be visible (it is in the gap)
    expect(screen.queryByRole('button', { name: /page 5/i })).not.toBeInTheDocument()
  })

  it('accepts a className prop and applies it to the wrapper', () => {
    const { container } = render(
      <PaginationBar page={1} totalPages={3} onPageChange={vi.fn()} className="mt-8" />,
    )
    expect(container.firstChild).toHaveClass('mt-8')
  })
})
