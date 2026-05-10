import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { ImpersonationBanner } from './ImpersonationBanner'
import type { User } from '#/types/api'

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

import { useCurrentUser } from '#/lib/queries/users'
import { useMutation } from '@tanstack/react-query'

const baseUser: User = {
  userId: 'alice-id',
  name: 'Alice',
  email: 'alice@example.com',
  impersonatedBy: null,
  role: null,
  profiles: [],
}

async function renderBanner() {
  const rootRoute = createRootRoute({ component: ImpersonationBanner })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('ImpersonationBanner', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, impersonatedBy: null },
    } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useMutation).mockImplementation((() => ({
      mutate: vi.fn(),
      isPending: false,
    })) as unknown as typeof useMutation)
  })

  it('renders the banner when impersonatedBy is non-null', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, impersonatedBy: 'admin-id' },
    } as ReturnType<typeof useCurrentUser>)
    await renderBanner()
    expect(screen.getByText(/impersonating alice/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit impersonation/i })).toBeInTheDocument()
  })

  it('clicking Exit Impersonation calls the mutation', async () => {
    const mockMutate = vi.fn()
    vi.mocked(useMutation).mockImplementation((() => ({
      mutate: mockMutate,
      isPending: false,
    })) as unknown as typeof useMutation)
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, impersonatedBy: 'admin-id' },
    } as ReturnType<typeof useCurrentUser>)
    await renderBanner()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /exit impersonation/i }))
    })
    expect(mockMutate).toHaveBeenCalled()
  })
})
