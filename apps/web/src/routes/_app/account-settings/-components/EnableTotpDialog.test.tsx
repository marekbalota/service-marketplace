import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEnable = vi.hoisted(() => vi.fn())
const mockVerifyTotp = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      enable: mockEnable,
      verifyTotp: mockVerifyTotp,
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { EnableTotpDialog } from './EnableTotpDialog'

function renderDialog(open = true) {
  return render(<EnableTotpDialog open={open} onOpenChange={vi.fn()} />)
}

describe('EnableTotpDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnable.mockResolvedValue({ data: { totpURI: 'otpauth://test', backupCodes: ['aaa', 'bbb'] }, error: null })
    mockVerifyTotp.mockResolvedValue({ data: {}, error: null })
  })

  it('renders password input on step 1', () => {
    renderDialog()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Continue button disabled when password empty', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('moves to step 2 after password confirm success', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(mockEnable).toHaveBeenCalledWith({ password: 'secret123' })
      expect(screen.getByText(/scan the qr code/i)).toBeInTheDocument()
    })
  })

  it('shows error on step 1 when enable fails', async () => {
    mockEnable.mockResolvedValueOnce({ data: null, error: { message: 'Wrong password' } })
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(screen.getByText(/wrong password/i)).toBeInTheDocument()
    })
  })

  it('shows backup codes on final step after TOTP verify', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByText(/scan the qr code/i))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => screen.getByPlaceholderText('000000'))
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => {
      expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
      expect(screen.getByText('aaa')).toBeInTheDocument()
    })
  })
})
