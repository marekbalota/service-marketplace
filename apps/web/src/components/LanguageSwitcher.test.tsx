import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'

beforeEach(() => {
  localStorage.clear()
})

describe('LanguageSwitcher', () => {
  it('shows EN as default when localStorage is empty', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('combobox')).toHaveTextContent('EN')
  })

  it('reads initial language from localStorage', () => {
    localStorage.setItem('language', 'sk')
    render(<LanguageSwitcher />)
    expect(screen.getByRole('combobox')).toHaveTextContent('SK')
  })

  it('persists selected language to localStorage on change', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'CS' }))
    expect(localStorage.getItem('language')).toBe('cs')
  })
})
