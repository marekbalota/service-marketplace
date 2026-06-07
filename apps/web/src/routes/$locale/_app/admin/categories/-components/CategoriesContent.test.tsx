import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { useSuspenseQuery } from '@tanstack/react-query'

const mockNavigate = vi.fn()
const mockUseSearch = vi.fn()

vi.doMock('../route', () => ({
  SORT_BY_VALUES: ['name', 'activePosts', 'archivedPosts', 'totalPosts'],
  SORT_ORDER_VALUES: ['asc', 'desc'],
  TRANSLATION_FILTER_VALUES: ['complete', 'incomplete', 'sk', 'cs'],
  Route: {
    useNavigate: () => mockNavigate,
    useSearch: () => mockUseSearch(),
  },
}))

vi.mock('#/lib/useLocale', () => ({
  useLocale: () => 'en',
}))

const { mockData, mockInvalidateQueries } = vi.hoisted(() => {
  const mockData = {
    items: [
      {
        categoryId: 'cat-1',
        translations: { en: 'Cleaning', sk: 'Čistenie' },
        activePosts: 3,
        archivedPosts: 1,
      },
      {
        categoryId: 'cat-2',
        translations: { en: 'Plumbing' },
        activePosts: 0,
        archivedPosts: 0,
      },
      {
        categoryId: 'cat-3',
        translations: { en: 'Tutoring', sk: 'Doučovanie', cs: 'Doučování' },
        activePosts: 5,
        archivedPosts: 2,
      },
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
          post: vi.fn().mockResolvedValue({
            data: { categoryId: 'new-1', translations: { en: 'New' } },
            error: null,
          }),
          get: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        },
      ),
    },
  },
}))

let CategoriesContent: typeof import('./CategoriesContent').CategoriesContent

beforeAll(async () => {
  CategoriesContent = (await import('./CategoriesContent')).CategoriesContent
})

describe('CategoriesContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: undefined,
    })
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

  it('shows empty state when server returns no items and no active filter', () => {
    vi.mocked(useSuspenseQuery).mockReturnValueOnce({
      data: { items: [], total: 0, totalPages: 0 },
    } as ReturnType<typeof useSuspenseQuery>)
    render(<CategoriesContent />)
    expect(screen.getByText(/No categories yet/i)).toBeInTheDocument()
  })

  it('shows "no match" empty state when filter is active and items are empty', () => {
    mockUseSearch.mockReturnValue({
      q: '',
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      translationFilter: 'complete',
    })
    vi.mocked(useSuspenseQuery).mockReturnValueOnce({
      data: { items: [], total: 0, totalPages: 0 },
    } as ReturnType<typeof useSuspenseQuery>)
    render(<CategoriesContent />)
    expect(screen.getByText(/No categories match/i)).toBeInTheDocument()
  })

  it('opens delete alert dialog when Delete button is clicked', () => {
    render(<CategoriesContent />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/Delete Category/i)).toBeInTheDocument()
  })

  it('opens edit dialog when Edit button is clicked', () => {
    render(<CategoriesContent />)
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0]!)
    expect(screen.getByText('Edit Category')).toBeInTheDocument()
  })
})
