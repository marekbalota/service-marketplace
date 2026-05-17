import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDisable = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('#/auth', () => ({ authClient: { twoFactor: { disable: mockDisable } } }))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { DisableMethodDialog } from './DisableMethodDialog'

describe('DisableMethodDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDisable.mockResolvedValue({ data: {}, error: null })
  })

  it('renders password field', () => {
    render(<DisableMethodDialog open onOpenChange={vi.fn()} isOnlyMethod />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Disable button disabled when password empty', () => {
    render(<DisableMethodDialog open onOpenChange={vi.fn()} isOnlyMethod />)
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeDisabled()
  })

  it('shows "turn off 2FA entirely" warning when isOnlyMethod', () => {
    render(<DisableMethodDialog open onOpenChange={vi.fn()} isOnlyMethod />)
    expect(screen.getByText(/turn off two-factor authentication/i)).toBeInTheDocument()
  })

  it('does not show "turn off 2FA entirely" when not isOnlyMethod', () => {
    render(<DisableMethodDialog open onOpenChange={vi.fn()} isOnlyMethod={false} />)
    expect(screen.queryByText(/turn off two-factor authentication/i)).not.toBeInTheDocument()
  })

  it('calls disable and invalidates on confirm', async () => {
    render(<DisableMethodDialog open onOpenChange={vi.fn()} isOnlyMethod />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } })
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    await waitFor(() => {
      expect(mockDisable).toHaveBeenCalledWith({ password: 'mypass' })
      expect(mockInvalidate).toHaveBeenCalled()
    })
  })
})
