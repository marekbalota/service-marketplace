import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SearchFilterBar } from './SearchFilterBar'

const mockFilters = [
  { label: 'Type', control: <select aria-label="Type" /> },
  { label: 'Sort', control: <select aria-label="Sort" />, desktopWidth: 'w-[200px]' },
]

describe('SearchFilterBar', () => {
  it('renders the search input with the given placeholder', () => {
    render(
      <SearchFilterBar
        searchPlaceholder="Search posts..."
        searchValue=""
        onSearchChange={vi.fn()}
        filters={mockFilters}
      />,
    )
    expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument()
  })

  it('calls onSearchChange when the input changes', () => {
    const onSearchChange = vi.fn()
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={onSearchChange}
        filters={mockFilters}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(onSearchChange).toHaveBeenCalledWith('hello')
  })

  it('renders filter labels inside the sheet', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        filters={mockFilters}
        sheetTitle="Filters"
      />,
    )
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Sort')).toBeInTheDocument()
  })

  it('renders the mobile sheet trigger button', () => {
    render(
      <SearchFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        filters={mockFilters}
      />,
    )
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument()
  })
})
