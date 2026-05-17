import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockEnable = vi.hoisted(() => vi.fn())
const mockSendOtp = vi.hoisted(() => vi.fn())
const mockVerifyOtp = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      enable: mockEnable,
      sendOtp: mockSendOtp,
      verifyOtp: mockVerifyOtp,
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { EnableEmailDialog } from './EnableEmailDialog'

describe('EnableEmailDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    mockEnable.mockResolvedValue({ data: { backupCodes: ['x1', 'x2'] }, error: null })
    mockSendOtp.mockResolvedValue({ data: {}, error: null })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })
  })

  afterEach(() => vi.useRealTimers())

  it('renders password input on step 1', () => {
    render(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Continue disabled when password is empty', () => {
    render(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('moves to step 2 (send code screen) after password confirm', async () => {
    render(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
    })
  })

  it('Back button visible on step 2 before and after sending code', async () => {
    render(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => { expect(mockSendOtp).toHaveBeenCalled() })
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows backup codes on step 3 after verify', async () => {
    render(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => screen.getByPlaceholderText('000000'))
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '654321' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => {
      expect(screen.getByText('x1')).toBeInTheDocument()
    })
  })
})
