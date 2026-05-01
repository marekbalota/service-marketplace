import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UnbanDialog } from './UnbanDialog'

describe('UnbanDialog', () => {
  it('renders the user name in the title', () => {
    render(
      <UnbanDialog open={true} userName="Jane Doe" onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText(/unban jane doe/i)).toBeInTheDocument()
  })

  it('renders the description about restoring access', () => {
    render(
      <UnbanDialog open={true} userName="Jane" onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText(/restore full access/i)).toBeInTheDocument()
  })

  it('calls onConfirm when the Confirm button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <UnbanDialog open={true} userName="Jane" onConfirm={onConfirm} onClose={vi.fn()} />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    })
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn()
    render(
      <UnbanDialog open={true} userName="Jane" onConfirm={vi.fn()} onClose={onClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
