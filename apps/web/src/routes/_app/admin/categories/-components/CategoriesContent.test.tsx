import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CategoriesContent } from './CategoriesContent'

const mockNavigate = vi.fn()
const mockUseSearch = vi.fn(() => ({ q: '', page: undefined }))

vi.mock('../route', () => ({
  Route: {
    useNavigate: () => mockNavigate,
    useSearch: () => mockUseSearch(),
  },
}))

const { mockData, mockInvalidateQueries } = vi.hoisted(() => {
  const mockData = {
    items: [
      { categoryId: 'cat-1', name: 'Cleaning', activePosts: 3, archivedPosts: 1 },
      { categoryId: 'cat-2', name: 'Plumbing', activePosts: 0, archivedPosts: 0 },
      { categoryId: 'cat-3', name: 'Tutoring', activePosts: 5, archivedPosts: 2 },
    ],
    total: 3,
    totalPages: 1,
  }
  const mockInvalidateQueries = vi.fn()
  return { mockData, mockInvalidateQueries }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: vi.fn(() => ({ data: mockData })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      categories: Object.assign(
        vi.fn(() => ({
          patch: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockResolvedValue({ error: null }),
        })),
        {
          post: vi
            .fn()
            .mockResolvedValue({
              data: { categoryId: 'new-1', name: 'New', description: null },
              error: null,
            }),
          get: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        },
      ),
    },
  },
}))

describe('CategoriesContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue({ q: '', page: undefined })
  })

  it('shows category count from server total', () => {
    render(<CategoriesContent />)
    expect(screen.getByText(/Categories \(3\)/)).toBeInTheDocument()
  })

  it('shows post counts for each category', () => {
    render(<CategoriesContent />)
    expect(screen.getAllByText(/3 active/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/1 archived/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/4 total/).length).toBeGreaterThan(0)
  })

  it('shows empty state when server returns no items', () => {
    vi.mocked(useSuspenseQuery).mockReturnValueOnce({
      data: { items: [], total: 0, totalPages: 0 },
    } as ReturnType<typeof useSuspenseQuery>)
    render(<CategoriesContent />)
    expect(screen.getByText(/No categories/i)).toBeInTheDocument()
  })

  it('opens delete alert dialog when Delete button is clicked', () => {
    render(<CategoriesContent />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/Delete Category/i)).toBeInTheDocument()
  })

  it('opens rename dialog when Rename button is clicked', () => {
    render(<CategoriesContent />)
    const renameButtons = screen.getAllByRole('button', { name: /rename/i })
    fireEvent.click(renameButtons[0]!)
    expect(screen.getByText('Rename Category')).toBeInTheDocument()
  })

  it('opens create dialog when New Category is clicked', () => {
    render(<CategoriesContent />)
    fireEvent.click(screen.getByRole('button', { name: /new category/i }))
    expect(screen.getByText('Create Category')).toBeInTheDocument()
  })
})
