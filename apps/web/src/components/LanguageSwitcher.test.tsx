import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LanguageSwitcher', () => {
  it('shows EN as default', () => {
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: /language/i })
    expect(trigger).toHaveTextContent('EN')
  })

  it('displays the current locale from the URL param, not localStorage', () => {
    localStorage.setItem('language', 'sk')
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: /language/i })
    expect(trigger).toHaveTextContent('EN')
  })

  it('calls navigate with the new locale when a language is selected', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)
    await user.click(screen.getByRole('button', { name: /language/i }))
    await user.click(await screen.findByRole('menuitem', { name: /čeština/i }))
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '.', replace: true }))
  })
})
