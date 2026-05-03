import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ImagePickerGrid } from './ImagePickerGrid'

describe('ImagePickerGrid', () => {
  it('renders an add button', () => {
    render(<ImagePickerGrid previews={[]} onFilePicked={vi.fn()} onRemove={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders preview images', () => {
    render(
      <ImagePickerGrid
        previews={['http://example.com/img.jpg']}
        onFilePicked={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByAltText('Preview')).toBeInTheDocument()
  })

  it('calls onRemove with the correct index when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(
      <ImagePickerGrid
        previews={['http://example.com/img.jpg']}
        onFilePicked={vi.fn()}
        onRemove={onRemove}
      />,
    )
    // First button is the remove button for the first preview
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]!)
    expect(onRemove).toHaveBeenCalledWith(0)
  })
})
