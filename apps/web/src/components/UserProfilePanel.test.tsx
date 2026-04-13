import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { UserProfilePanel } from './UserProfilePanel'

const mockSignOut = vi.hoisted(() => vi.fn())
const mockUseActiveUser = vi.hoisted(() => vi.fn())

vi.mock('#/auth', () => ({
  authClient: { signOut: mockSignOut },
}))

vi.mock('#/contexts/ActiveUserContext', () => ({
  useActiveUser: mockUseActiveUser,
}))

// SheetClose requires a Sheet (Dialog) context that isn't present in unit tests;
// replace it with a passthrough that renders the `render` prop with its children.
vi.mock('#/components/ui/sheet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/components/ui/sheet')>()
  return {
    ...actual,
    SheetClose: ({ render: renderProp, children }: { render?: React.ReactElement; children?: React.ReactNode }) =>
      renderProp ? React.cloneElement(renderProp, {}, children) : <>{children}</>,
  }
})

const baseProfile = {
  userProfileId: 'profile-1',
  name: 'Alice',
  roleName: 'user',
  email: 'alice@example.com',
}

async function renderPanel(onClose = vi.fn()) {
  const rootRoute = createRootRoute({ component: () => <UserProfilePanel onClose={onClose} /> })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('UserProfilePanel', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined)
    mockUseActiveUser.mockReturnValue({
      activeProfile: baseProfile,
      allProfiles: [baseProfile],
      setActiveProfileId: vi.fn(),
    })
  })

  it('renders Browse Postings and My Postings navigation links', async () => {
    await renderPanel()
    expect(screen.getByText('Browse Postings')).toBeInTheDocument()
    expect(screen.getByText('My Postings')).toBeInTheDocument()
  })

  it('calls authClient.signOut and onClose when Log out is clicked', async () => {
    const onClose = vi.fn()
    await renderPanel(onClose)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    })
    expect(mockSignOut).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the profile switcher when profiles are available', async () => {
    await renderPanel()
    expect(screen.getByText('Switch Profile')).toBeInTheDocument()
  })

  it('hides the profile switcher when there are no profiles', async () => {
    mockUseActiveUser.mockReturnValue({
      activeProfile: null,
      allProfiles: [],
      setActiveProfileId: vi.fn(),
    })
    await renderPanel()
    expect(screen.queryByText('Switch Profile')).not.toBeInTheDocument()
  })
})
