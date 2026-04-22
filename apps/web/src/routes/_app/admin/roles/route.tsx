import { useNavigate, createFileRoute, redirect } from '@tanstack/react-router';
import type { Dispatch, SetStateAction } from 'react';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSuspenseQuery, useQueryClient, queryOptions } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { api } from '#/api';
import { BackButton } from '#/components/BackButton';
import { PageHeader } from '#/components/PageHeader';
import { StatCard } from '../-components/StatCard';
import { Button } from '#/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog';
import { Badge } from '#/components/ui/badge';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Checkbox } from '#/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';
import { useCurrentUser } from '#/lib/userQueries';
import { Permissions, hasPermissions } from '@marketplace/shared';

import type { AdminRolesModel } from 'api';

export type Role = AdminRolesModel['rolesResponse'][number];
export type Permission = AdminRolesModel['permissionResponse'][number];

export const rolesQueryOptions = queryOptions({
  queryKey: ['admin', 'roles'],
  queryFn: async () => {
    const response = await api.admin.roles.get();
    return response.data ?? [];
  },
});

export const permissionsQueryOptions = queryOptions({
  queryKey: ['admin', 'permissions'],
  queryFn: async () => {
    const response = await api.admin.roles.permissions.get();
    return response.data ?? [];
  },
});

export const Route = createFileRoute('/_app/admin/roles')({
  beforeLoad: ({ context }) => {
    const user = context.user;
    const permissions = user?.role?.permissions ?? [];
    if (!hasPermissions(permissions, [Permissions.AdminRolesManage])) {
      throw redirect({ to: '/admin' });
    }
  },
  component: ManageRoles,
});

function ManageRoles() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const userPriority = user?.role?.priority ?? 0;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<NewRoleState>({
    name: '',
    description: '',
    permissionIds: [],
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Roles"
        description="Configure user roles and permissions for the platform"
        action={
          <Suspense fallback={null}>
            <CreateRoleButton
              isOpen={isCreateDialogOpen}
              setIsOpen={setIsCreateDialogOpen}
              newRole={newRole}
              setNewRole={setNewRole}
            />
          </Suspense>
        }
      />

      <Suspense fallback={<RolesSkeleton />}>
        <RolesContent
          editingRole={editingRole}
          setEditingRole={setEditingRole}
          newRole={newRole}
          setNewRole={setNewRole}
          userPriority={userPriority}
        />
      </Suspense>
    </main>
  );
}

function RolesSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="mb-2 h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

type NewRoleState = { name: string; description: string; permissionIds: string[] };

interface CreateRoleButtonProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  newRole: NewRoleState;
  setNewRole: Dispatch<SetStateAction<NewRoleState>>;
}

function CreateRoleButton({ isOpen, setIsOpen, newRole, setNewRole }: CreateRoleButtonProps) {
  const queryClient = useQueryClient();
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions);

  const togglePermission = (permissionId: string) => {
    setNewRole((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((p) => p !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleCreate = async () => {
    await api.admin.roles.post({
      name: newRole.name,
      description: newRole.description,
      permissionIds: newRole.permissionIds,
    });
    setIsOpen(false);
    setNewRole({ name: '', description: '', permissionIds: [] });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] }),
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button className="gap-2">
          <Plus className="size-4" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a new role with specific permissions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Content Manager"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Brief description of this role"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {permissions.map((permission) => (
                <div key={permission.permissionId} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.permissionId}
                    checked={newRole.permissionIds.includes(permission.permissionId)}
                    onCheckedChange={() => togglePermission(permission.permissionId)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={permission.permissionId}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {permission.description ?? permission.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setNewRole({ name: '', description: '', permissionIds: [] });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newRole.name || !newRole.description}
              className="flex-1"
            >
              Create Role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RolesContentProps {
  editingRole: Role | null;
  setEditingRole: (role: Role | null) => void;
  newRole: NewRoleState;
  setNewRole: Dispatch<SetStateAction<NewRoleState>>;
  userPriority: number;
}

function RolesContent({ editingRole, setEditingRole, newRole, setNewRole, userPriority }: RolesContentProps) {
  const { data: rolesData = [] } = useSuspenseQuery(rolesQueryOptions);
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions);
  const queryClient = useQueryClient();

  const [roles, setRoles] = useState<Role[]>(rolesData);

  // Sortable roles: those with lower priority than current user
  const sortableRoles = roles.filter(r => r.priority < userPriority);

  // Sync local state when query data changes
  useEffect(() => {
    setRoles(rolesData);
  }, [rolesData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortableRoles.findIndex(r => r.roleId === active.id);
      const newIndex = sortableRoles.findIndex(r => r.roleId === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newSortableRoles = arrayMove(sortableRoles, oldIndex, newIndex);

      // Update the full roles array with the new sortable order at the bottom
      const nonSortableRoles = roles.filter(r => r.priority >= userPriority);
      setRoles([...nonSortableRoles, ...newSortableRoles]);

      // Calculate new priority (higher index = higher priority in full list)
      const targetRole = sortableRoles[oldIndex]!;
      const newPriorityInFullList = roles.length - 1 - (nonSortableRoles.length + newIndex);

      try {
        await api.admin.roles.reorder.patch({
          roleId: targetRole.roleId,
          newPriority: newPriorityInFullList,
        });
        queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      } catch (error) {
        // Revert on error
        setRoles(roles);
        console.error('Failed to reorder role:', error);
      }
    }
  }, [sortableRoles, roles, queryClient, userPriority]);

  const togglePermission = (permissionId: string) => {
    setNewRole((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((p) => p !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions,
    });
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    await api.admin.roles({ id: editingRole.roleId }).patch({
      name: newRole.name,
      description: newRole.description,
      permissionIds: newRole.permissionIds,
    });
    setEditingRole(null);
    setNewRole({ name: '', description: '', permissionIds: [] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    await api.admin.roles({ id: roleId }).delete();
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
  };

  const getRoleColor = (isDefault: boolean) => {
    return isDefault ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard value={roles.length} label="Total Roles" />
        <StatCard value={permissions.length} label="Available Permissions" />
        <StatCard value={roles.reduce((sum, r) => sum + (r.userCount || 0), 0)} label="Total Users with Roles" />
      </div>

      {/* Non-sortable roles (equal or higher priority than current user) */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {roles.filter(r => r.priority >= userPriority).map((role) => (
          <SortableRoleCard
            key={role.roleId}
            role={role}
            permissions={permissions}
            editingRole={editingRole}
            setEditingRole={setEditingRole}
            newRole={newRole}
            setNewRole={setNewRole}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
            onUpdateRole={handleUpdateRole}
            togglePermission={togglePermission}
            getRoleColor={getRoleColor}
            canReorder={false}
          />
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableRoles.map(r => r.roleId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-6">
            {sortableRoles.map((role) => (
              <SortableRoleCard
                key={role.roleId}
                role={role}
                permissions={permissions}
                editingRole={editingRole}
                setEditingRole={setEditingRole}
                newRole={newRole}
                setNewRole={setNewRole}
                onEdit={handleEditRole}
                onDelete={handleDeleteRole}
                onUpdateRole={handleUpdateRole}
                togglePermission={togglePermission}
                getRoleColor={getRoleColor}
                canReorder={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

interface SortableRoleCardProps {
  role: Role;
  permissions: Permission[];
  editingRole: Role | null;
  setEditingRole: (role: Role | null) => void;
  newRole: NewRoleState;
  setNewRole: Dispatch<SetStateAction<NewRoleState>>;
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
  onUpdateRole: () => void;
  togglePermission: (permissionId: string) => void;
  getRoleColor: (isDefault: boolean) => string;
  canReorder: boolean;
}

function SortableRoleCard({
  role,
  permissions,
  editingRole,
  setEditingRole,
  newRole,
  setNewRole,
  onEdit,
  onDelete,
  onUpdateRole,
  togglePermission,
  getRoleColor,
  canReorder,
}: SortableRoleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.roleId, disabled: !canReorder });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="relative overflow-hidden">
        {/* Grip handle - left side, centered */}
        {canReorder && (
          <button
            className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted cursor-grab active:cursor-grabbing transition-all duration-200 ease-out z-10"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <GripVertical className="size-5 text-muted-foreground" />
          </button>
        )}
        {/* Main content - shifts right on hover */}
        <div className={canReorder ? "transition-all duration-200 ease-out group-hover:pl-10" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle>{role.name}</CardTitle>
                  <Badge className={getRoleColor(role.isDefault)}>
                    {role.isDefault ? 'default' : 'custom'}
                  </Badge>
                  {role.userCount > 0 && (
                    <Badge variant="outline">
                      {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <CardDescription>{role.description}</CardDescription>
              </div>
              <div className="flex gap-2">
              {canReorder && (
                <>
                  <Dialog
                    open={editingRole?.roleId === role.roleId}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingRole(null);
                        setNewRole({ name: '', description: '', permissionIds: [] });
                      }
                    }}
                  >
                    <DialogTrigger>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => onEdit(role)}
                      >
                        <Edit className="size-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>
                          Modify role permissions and details
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Role Name *</Label>
                          <Input
                            id="edit-name"
                            value={newRole.name}
                            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description *</Label>
                          <Input
                            id="edit-description"
                            value={newRole.description}
                            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Permissions</Label>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                            {permissions.map((permission) => (
                              <div key={permission.permissionId} className="flex items-start space-x-3">
                                <Checkbox
                                  id={`edit-${permission.permissionId}`}
                                  checked={newRole.permissionIds.includes(permission.permissionId)}
                                  onCheckedChange={() => togglePermission(permission.permissionId)}
                                />
                                <div className="flex-1">
                                  <label
                                    htmlFor={`edit-${permission.permissionId}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {permission.description ?? permission.name}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingRole(null);
                              setNewRole({ name: '', description: '', permissionIds: [] });
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={onUpdateRole}
                            disabled={!newRole.name || !newRole.description}
                            className="flex-1"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {!role.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => onDelete(role.roleId)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm font-medium mb-3">
                Permissions ({role.permissions.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permId) => {
                  const perm = permissions.find(p => p.permissionId === permId);
                  return perm ? (
                    <Badge key={permId} variant="secondary">
                      {perm.description ?? perm.name}
                    </Badge>
                  ) : (
                    <Badge key={permId} variant="secondary">
                      {permId}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
