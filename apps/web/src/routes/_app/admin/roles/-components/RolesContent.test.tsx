import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RolesContent } from './RolesContent'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  arrayMove: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => '' } },
}))

const mockMutateAsync = vi.fn().mockResolvedValue(undefined)

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: vi.fn((opts: { queryKey: unknown[] }) => {
      if (Array.isArray(opts.queryKey) && opts.queryKey[1] === 'permissions') {
        return { data: mockPermissions }
      }
      return { data: mockRoles }
    }),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      variables: undefined,
    })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      roles: Object.assign(
        vi.fn(() => ({
          delete: vi.fn().mockResolvedValue({ error: null }),
          default: { patch: vi.fn().mockResolvedValue({ error: null }) },
          patch: vi.fn().mockResolvedValue({ error: null }),
        })),
        {
          reorder: { patch: vi.fn().mockResolvedValue({ error: null }) },
        },
      ),
    },
  },
}))

const mockPermissions = [
  { permissionId: 'perm-1', name: 'admin:roles:manage', description: 'Manage roles' },
  { permissionId: 'perm-2', name: 'posts:edit', description: 'Edit posts' },
]

const mockRoles = [
  {
    roleId: 'role-1',
    name: 'Admin',
    description: 'Administrator',
    isDefault: false,
    permissions: ['perm-1'],
    userCount: 5,
    priority: 1,
  },
  {
    roleId: 'role-2',
    name: 'Member',
    description: 'Regular member',
    isDefault: true,
    permissions: [],
    userCount: 10,
    priority: 2,
  },
]

// userPriority=100 means all roles (priority < 100) are sortable => canEdit=true
function renderContent() {
  return render(<RolesContent userPriority={100} userPermissionNames={[]} />)
}

describe('RolesContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue(undefined)
  })

  it('renders stat card showing total role count', () => {
    renderContent()
    // Both roles and permissions counts are 2; verify via label proximity
    const totalRolesLabel = screen.getByText('Total Roles')
    expect(totalRolesLabel).toBeInTheDocument()
    // The sibling value element is the previous element in the same card-content
    const valueEl = totalRolesLabel.previousElementSibling
    expect(valueEl?.textContent).toBe('2')
  })

  it('renders stat card showing available permissions count', () => {
    renderContent()
    expect(screen.getByText('Available Permissions')).toBeInTheDocument()
  })

  it('renders stat card showing total users with roles', () => {
    renderContent()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Total Users with Roles')).toBeInTheDocument()
  })

  it('renders a card for each role', () => {
    renderContent()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
  })

  it('shows delete confirm dialog when Delete is clicked', () => {
    renderContent()
    // role-1 is not default, so it has a Delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)
    expect(screen.getByText('Delete role?')).toBeInTheDocument()
  })

  it('closes delete dialog when Cancel is clicked', async () => {
    renderContent()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)
    expect(screen.getByText('Delete role?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText('Delete role?')).not.toBeInTheDocument()
  })

  it('shows set-default confirm dialog when Set as Default is clicked', () => {
    renderContent()
    const setDefaultButtons = screen.getAllByRole('button', { name: /set as default/i })
    fireEvent.click(setDefaultButtons[0]!)
    expect(screen.getByText('Set as default role?')).toBeInTheDocument()
  })

  it('calls mutateAsync when delete is confirmed', async () => {
    renderContent()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    })
    expect(mockMutateAsync).toHaveBeenCalled()
  })
})
