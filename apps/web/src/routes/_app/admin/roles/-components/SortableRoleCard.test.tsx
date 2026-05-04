import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SortableRoleCard } from './SortableRoleCard'

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => '' } },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      variables: undefined,
    })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      roles: vi.fn(() => ({ patch: vi.fn().mockResolvedValue({ error: null }) })),
    },
  },
}))

const basePermissions = [
  { permissionId: 'perm-1', name: 'posts:edit', description: 'Edit posts' },
]

const baseRole = {
  roleId: 'role-1',
  name: 'Editor',
  description: 'Can edit content',
  isDefault: false,
  permissions: ['perm-1'],
  userCount: 3,
  priority: 5,
}

function renderCard(overrides: Partial<React.ComponentProps<typeof SortableRoleCard>> = {}) {
  const onDelete = vi.fn()
  const onSetDefault = vi.fn()
  render(
    <SortableRoleCard
      role={baseRole}
      permissions={basePermissions}
      onDelete={onDelete}
      onSetDefault={onSetDefault}
      canEdit={true}
      isPendingDelete={false}
      isPendingSetDefault={false}
      {...overrides}
    />,
  )
  return { onDelete, onSetDefault }
}

describe('SortableRoleCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders role name and description', () => {
    renderCard()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('Can edit content')).toBeInTheDocument()
  })

  it('renders user-count badge when userCount > 0', () => {
    renderCard()
    expect(screen.getByText('3 users')).toBeInTheDocument()
  })

  it('does not render user-count badge when userCount is 0', () => {
    renderCard({ role: { ...baseRole, userCount: 0 } })
    expect(screen.queryByText(/user/)).not.toBeInTheDocument()
  })

  it('renders default badge when isDefault is true', () => {
    renderCard({ role: { ...baseRole, isDefault: true } })
    expect(screen.getByText('default')).toBeInTheDocument()
  })

  it('does not render default badge when isDefault is false', () => {
    renderCard()
    expect(screen.queryByText('default')).not.toBeInTheDocument()
  })

  it('shows Edit, Set as Default and Delete buttons when canEdit is true', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set as default/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides Edit, Set as Default and Delete buttons when canEdit is false', () => {
    renderCard({ canEdit: false })
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set as default/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('hides Set as Default and Delete when isDefault is true', () => {
    renderCard({ role: { ...baseRole, isDefault: true } })
    expect(screen.queryByRole('button', { name: /set as default/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('calls onDelete with the role id when Delete is clicked', () => {
    const { onDelete } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('role-1')
  })

  it('calls onSetDefault with the role id when Set as Default is clicked', () => {
    const { onSetDefault } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /set as default/i }))
    expect(onSetDefault).toHaveBeenCalledWith('role-1')
  })

  it('renders permission badges from the permissions list', () => {
    renderCard()
    expect(screen.getByText('Edit posts')).toBeInTheDocument()
  })
})
