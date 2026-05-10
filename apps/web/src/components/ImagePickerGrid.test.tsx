import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImagePickerGrid } from './ImagePickerGrid'

// Simulate Image load/error behaviour controllably
function mockImageLoad(valid: boolean) {
  vi.spyOn(globalThis, 'Image').mockImplementation(() => {
    const img = {
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      set src(_: string) {
        if (valid) this.onload?.()
        else this.onerror?.()
      },
    }
    return img as unknown as HTMLImageElement
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
})

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
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]!)
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('calls onFilePicked when a valid image is selected', async () => {
    mockImageLoad(true)
    const onFilePicked = vi.fn()
    render(<ImagePickerGrid previews={[]} onFilePicked={onFilePicked} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(onFilePicked).toHaveBeenCalledWith(file))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not call onFilePicked and shows an error for an unreadable file', async () => {
    mockImageLoad(false)
    const onFilePicked = vi.fn()
    render(<ImagePickerGrid previews={[]} onFilePicked={onFilePicked} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['not-an-image'], 'bad.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText(/1 file could not be read/i)).toBeInTheDocument())
    expect(onFilePicked).not.toHaveBeenCalled()
  })

  it('accepts valid files and rejects invalid ones in a mixed batch', async () => {
    const calls: boolean[] = []
    vi.spyOn(globalThis, 'Image').mockImplementation(() => {
      let idx = calls.length
      calls.push(false)
      const img = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        set src(_: string) {
          // first file valid, second invalid
          if (idx === 0) this.onload?.()
          else this.onerror?.()
        },
      }
      return img as unknown as HTMLImageElement
    })

    const onFilePicked = vi.fn()
    render(<ImagePickerGrid previews={[]} onFilePicked={onFilePicked} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const good = new File(['data'], 'good.jpg', { type: 'image/jpeg' })
    const bad = new File(['x'], 'bad.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [good, bad] } })

    await waitFor(() => expect(onFilePicked).toHaveBeenCalledTimes(1))
    expect(onFilePicked).toHaveBeenCalledWith(good)
    expect(screen.getByText(/1 file could not be read/i)).toBeInTheDocument()
  })

  it('dismisses the error banner when the X button is clicked', async () => {
    mockImageLoad(false)
    render(<ImagePickerGrid previews={[]} onFilePicked={vi.fn()} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'bad.txt')] } })

    await waitFor(() => screen.getByText(/1 file could not be read/i))
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument()
  })
})
