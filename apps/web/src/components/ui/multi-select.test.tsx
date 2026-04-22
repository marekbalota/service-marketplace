import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

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
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('collapses overflow tags into "+N more" when maxTags is set', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={['a', 'b', 'c']}
        displayMode="tags"
        maxTags={1}
      />,
    )
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.queryByText('Option B')).not.toBeInTheDocument()
    expect(screen.queryByText('Option C')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
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
