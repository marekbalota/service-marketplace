import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageInput } from './MessageInput'

function renderInput(props: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  return render(
    <MessageInput
      draft=""
      isPending={false}
      isError={false}
      onChange={vi.fn()}
      onSend={vi.fn()}
      {...props}
    />,
  )
}

describe('MessageInput', () => {
  it('renders the message textarea', () => {
    renderInput()
    expect(screen.getByPlaceholderText(/write a message/i)).toBeInTheDocument()
  })

  it('send button is disabled when draft is empty', () => {
    renderInput({ draft: '' })
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('send button is disabled when isPending=true', () => {
    renderInput({ draft: 'hello', isPending: true })
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('send button is enabled when draft is non-empty and not pending', () => {
    renderInput({ draft: 'hello' })
    expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled()
  })

  it('calls onChange when the user types', () => {
    const onChange = vi.fn()
    renderInput({ onChange })
    fireEvent.change(screen.getByPlaceholderText(/write a message/i), {
      target: { value: 'Hi there' },
    })
    expect(onChange).toHaveBeenCalledWith('Hi there')
  })

  it('calls onSend when the send button is clicked', () => {
    const onSend = vi.fn()
    renderInput({ draft: 'hello', onSend })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).toHaveBeenCalled()
  })

  it('calls onSend when Enter is pressed without Shift', () => {
    const onSend = vi.fn()
    renderInput({ draft: 'hello', onSend })
    fireEvent.keyDown(screen.getByPlaceholderText(/write a message/i), {
      key: 'Enter',
      shiftKey: false,
    })
    expect(onSend).toHaveBeenCalled()
  })

  it('does not call onSend when Shift+Enter is pressed', () => {
    const onSend = vi.fn()
    renderInput({ draft: 'hello', onSend })
    fireEvent.keyDown(screen.getByPlaceholderText(/write a message/i), {
      key: 'Enter',
      shiftKey: true,
    })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows an error message when isError=true', () => {
    renderInput({ isError: true })
    expect(screen.getByText(/failed to send/i)).toBeInTheDocument()
  })

  it('does not show an error message when isError=false', () => {
    renderInput({ isError: false })
    expect(screen.queryByText(/failed to send/i)).not.toBeInTheDocument()
  })
})
