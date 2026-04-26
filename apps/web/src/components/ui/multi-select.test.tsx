import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

/** Mocks offsetWidth so measurement-based overflow tests work in JSDOM. */
function mockOffsetWidth(tagPx: number, overflowPx: number, containerPx: number) {
  return vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      if ('mTag' in this.dataset) return tagPx
      if ('mOverflow' in this.dataset) return overflowPx
      return containerPx
    },
  )
}

describe('MultiSelect', () => {
  it('shows placeholder when nothing is selected', () => {
    render(<MultiSelect options={OPTIONS} placeholder="Pick options" />)
    expect(screen.getByText('Pick options')).toBeInTheDocument()
  })

  it('shows "N selected" in text mode when items are selected', () => {
    render(
      <MultiSelect options={OPTIONS} value={['a', 'b']} displayMode="text" />,
    )
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('shows tag badges with labels in tags mode', () => {
    render(
      <MultiSelect options={OPTIONS} value={['a', 'b']} displayMode="tags" />,
    )
    // Real tags have labelled Remove buttons; the measurement span (aria-hidden) does not
    expect(screen.getByRole('button', { name: 'Remove Option A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Option B' })).toBeInTheDocument()
  })

  it('collapses overflow tags into a "+N more" badge when the container is narrow', () => {
    // tag=50px, overflow=36px, container=100px
    // tag0 (50) + overflowW (36+4gap=40) = 90 ≤ 100 ✓
    // tag0 + tag1 (50+4gap=54) + overflowW = 144 > 100 → break → visibleCount=1, overflow=2
    const mock = mockOffsetWidth(50, 36, 100)
    try {
      render(
        <MultiSelect options={OPTIONS} value={['a', 'b', 'c']} displayMode="tags" />,
      )
      // Only Option A has a Remove button (real visible tag)
      expect(screen.getByRole('button', { name: 'Remove Option A' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove Option B' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove Option C' })).not.toBeInTheDocument()
      // Real overflow badge shows "+2 more"; measurement span shows "+3 more" — unambiguous
      expect(screen.getByText('+2 more')).toBeInTheDocument()
    } finally {
      mock.mockRestore()
    }
  })

  it('removes hidden tags when the overflow badge × is clicked', () => {
    const handleChange = vi.fn()
    const mock = mockOffsetWidth(50, 36, 100)
    try {
      render(
        <MultiSelect
          options={OPTIONS}
          value={['a', 'b', 'c']}
          displayMode="tags"
          onValueChange={handleChange}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /remove 2 more/i }))
      expect(handleChange).toHaveBeenCalledWith(['a'])
    } finally {
      mock.mockRestore()
    }
  })

  it('calls onValueChange with item removed when tag × is clicked', () => {
    const handleChange = vi.fn()
    render(
      <MultiSelect
        options={OPTIONS}
        value={['a', 'b']}
        displayMode="tags"
        onValueChange={handleChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Option A' }))
    expect(handleChange).toHaveBeenCalledWith(['b'])
  })

  it('does not render × buttons on tags when disabled', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={['a']}
        displayMode="tags"
        disabled
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Remove Option A' }),
    ).not.toBeInTheDocument()
  })

  it('applies tagClassName to tag badges', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={['a']}
        displayMode="tags"
        tagClassName="bg-red-500"
      />,
    )
    const removeBtn = screen.getByRole('button', { name: 'Remove Option A' })
    expect(removeBtn.closest('.bg-red-500')).toBeInTheDocument()
  })

  it('opens the dropdown when trigger is clicked', () => {
    render(<MultiSelect options={OPTIONS} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('calls onValueChange with item added when an unselected option is clicked', () => {
    const handleChange = vi.fn()
    render(
      <MultiSelect
        options={OPTIONS}
        value={[]}
        onValueChange={handleChange}
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Option B'))
    expect(handleChange).toHaveBeenCalledWith(['b'])
  })

  it('calls onValueChange with item removed when a selected option is clicked', () => {
    const handleChange = vi.fn()
    render(
      <MultiSelect
        options={OPTIONS}
        value={['a', 'b']}
        onValueChange={handleChange}
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Option A'))
    expect(handleChange).toHaveBeenCalledWith(['b'])
  })

  it('renders CommandInput when searchable is true', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        searchable
        searchPlaceholder="Find option..."
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByPlaceholderText('Find option...')).toBeInTheDocument()
  })

  it('does not render CommandInput when searchable is false', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        searchable={false}
        searchPlaceholder="Find option..."
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(
      screen.queryByPlaceholderText('Find option...'),
    ).not.toBeInTheDocument()
  })
})
