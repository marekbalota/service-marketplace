import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SearchFilterBar } from './SearchFilterBar'

const mockFilters = [
  { label: 'Type', control: <select aria-label="Type" /> },
  { label: 'Sort', control: <select aria-label="Sort" />, desktopWidth: 'w-[200px]' },
]

describe('SearchFilterBar', () => {
  it('renders filter labels inside the sheet', () => {
    render(
      <SearchFilterBar
        search={<input placeholder="Search..." />}
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
        search={<input placeholder="Search..." />}
        filters={mockFilters}
      />,
    )
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument()
  })
})
