import { createFileRoute, redirect } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';
import { currentUserQueryOptions } from '#/contexts/ActiveUserContext';

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
  beforeLoad: async ({ context : { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions);
    const permissions = user.role?.permissions ?? [];
    const hasAdminAccess = permissions.some((p: string) => p.startsWith('admin:'));

    if (!hasAdminAccess) {
      throw redirect({ to: '/' });
    }

    return { user };
  },
});

function AdminLayout() {
  return <Outlet />;
}
