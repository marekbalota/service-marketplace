import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StarRatingInput } from './StarRatingInput'

describe('StarRatingInput', () => {
  it('renders 5 star buttons', () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('calls onChange with the correct star number when clicked', () => {
    const onChange = vi.fn()
    render(<StarRatingInput value={0} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button')[4]!) // 5th star
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn()
    render(<StarRatingInput value={3} onChange={onChange} disabled />)
    screen.getAllByRole('button').forEach(btn => fireEvent.click(btn))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows filled stars for all stars up to and including the current value', () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    // stars 1-3 should have fill-star-filled on the SVG inside them
    for (let i = 0; i < 3; i++) {
      const svg = buttons[i]!.querySelector('svg')!
      expect(svg.classList.contains('fill-star-filled')).toBe(true)
    }
    // stars 4-5 should NOT have fill-star-filled
    for (let i = 3; i < 5; i++) {
      const svg = buttons[i]!.querySelector('svg')!
      expect(svg.classList.contains('fill-star-filled')).toBe(false)
    }
  })

  it('shows hover preview: hovering star N fills stars 1 through N', () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.mouseEnter(buttons[3]!) // hover star 4
    for (let i = 0; i < 4; i++) {
      const svg = buttons[i]!.querySelector('svg')!
      expect(svg.classList.contains('fill-star-filled')).toBe(true)
    }
    // star 5 should NOT be filled
    expect(buttons[4]!.querySelector('svg')!.classList.contains('fill-star-filled')).toBe(false)
  })

  it('reverts to the actual value after mouse leaves', () => {
    const { container } = render(<StarRatingInput value={2} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.mouseEnter(buttons[4]!) // hover star 5
    fireEvent.mouseLeave(container.firstChild!) // leave container
    // only stars 1-2 should be filled
    for (let i = 0; i < 2; i++) {
      expect(buttons[i]!.querySelector('svg')!.classList.contains('fill-star-filled')).toBe(true)
    }
    for (let i = 2; i < 5; i++) {
      expect(buttons[i]!.querySelector('svg')!.classList.contains('fill-star-filled')).toBe(false)
    }
  })
})
