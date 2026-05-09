import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { Permissions, hasAnyPermission } from '@marketplace/shared';

export const Route = createFileRoute('/_app/admin/users')({
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? [];
    if (!hasAnyPermission(permissions, [Permissions.AdminUsersView, Permissions.AdminUsersAssignRole, Permissions.AdminUsersImpersonate, Permissions.AdminPostsDeleteAny])) {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
