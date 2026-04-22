import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BackButton } from './BackButton'

describe('BackButton', () => {
  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<BackButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
