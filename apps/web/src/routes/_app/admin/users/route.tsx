import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { Permissions, hasPermissions } from '@marketplace/shared';

export const Route = createFileRoute('/_app/admin/users')({
  beforeLoad: ({ context }) => {
    const user = context.user;
    const permissions = user?.role?.permissions ?? [];
    if (!hasPermissions(permissions, [Permissions.AdminUsersView])) {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
