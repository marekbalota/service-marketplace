import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FavouriteButton } from './FavouriteButton'

const mockAdd = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: vi.fn((opts: { mutationFn: unknown }) =>
      opts.mutationFn === undefined ? { mutate: mockAdd, isPending: false } : { mutate: mockAdd, isPending: false }
    ),
    useQuery: vi.fn(() => ({ data: undefined })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(() => ({ data: { userId: 'u1' } })),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({ activeProfile: { userProfileId: 'profile-1' } })),
}))

vi.mock('#/api', () => ({
  api: {
    favourites: Object.assign(
      vi.fn(() => ({
        post: vi.fn(),
        delete: vi.fn(),
      })),
      { get: vi.fn() }
    ),
  },
}))

import { useMutation } from '@tanstack/react-query'

describe('FavouriteButton', () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockImplementation(((_opts: any) => {
      return { mutate: mockAdd, isPending: false }
    }) as any)
  })

  it('renders a heart button', () => {
    render(<FavouriteButton postId="post-1" initialIsFavourite={false} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('heart is not filled when initialIsFavourite=false', () => {
    render(<FavouriteButton postId="post-1" initialIsFavourite={false} />)
    const svg = screen.getByRole('button').querySelector('svg')!
    expect(svg.classList.contains('fill-red-500')).toBe(false)
  })

  it('heart is filled when initialIsFavourite=true', () => {
    render(<FavouriteButton postId="post-1" initialIsFavourite={true} />)
    const svg = screen.getByRole('button').querySelector('svg')!
    expect(svg.classList.contains('fill-red-500')).toBe(true)
  })

  it('is disabled when disabled=true', () => {
    render(<FavouriteButton postId="post-1" initialIsFavourite={false} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls addMutation when clicking an unfavourited button', async () => {
    let addMutateFn: ReturnType<typeof vi.fn>
    let removeMutateFn: ReturnType<typeof vi.fn>
    let callCount = 0
    vi.mocked(useMutation).mockImplementation(((_opts: any) => {
      callCount++
      if (callCount === 1) {
        addMutateFn = vi.fn()
        return { mutate: addMutateFn, isPending: false }
      }
      removeMutateFn = vi.fn()
      return { mutate: removeMutateFn, isPending: false }
    }) as any)

    render(<FavouriteButton postId="post-1" initialIsFavourite={false} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(addMutateFn!).toHaveBeenCalled()
    expect(removeMutateFn!).not.toHaveBeenCalled()
  })

  it('calls removeMutation when clicking a favourited button', async () => {
    let addMutateFn: ReturnType<typeof vi.fn>
    let removeMutateFn: ReturnType<typeof vi.fn>
    let callCount = 0
    vi.mocked(useMutation).mockImplementation(((_opts: any) => {
      callCount++
      if (callCount === 1) {
        addMutateFn = vi.fn()
        return { mutate: addMutateFn, isPending: false }
      }
      removeMutateFn = vi.fn()
      return { mutate: removeMutateFn, isPending: false }
    }) as any)

    render(<FavouriteButton postId="post-1" initialIsFavourite={true} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(removeMutateFn!).toHaveBeenCalled()
    expect(addMutateFn!).not.toHaveBeenCalled()
  })
})
