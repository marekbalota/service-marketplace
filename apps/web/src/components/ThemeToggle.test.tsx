import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  localStorage.clear()
  mockMatchMedia()
})

describe('ThemeToggle', () => {
  it('starts in Auto mode when localStorage is empty', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/auto/i)
  })

  it('reads initial mode from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/dark/i)
  })

  it('cycles Auto → Light → Dark → Auto on repeated clicks', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/light/i)

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/dark/i)

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/auto/i)
  })

  it('persists the selected mode to localStorage after each click', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(localStorage.getItem('theme')).toBe('light')

    fireEvent.click(button)
    expect(localStorage.getItem('theme')).toBe('dark')

    fireEvent.click(button)
    expect(localStorage.getItem('theme')).toBe('auto')
  })
})
