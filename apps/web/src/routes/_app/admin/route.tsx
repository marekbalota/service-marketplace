import { createFileRoute, redirect } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { api } from '#/api';

const adminGuardQueryOptions = queryOptions({
  queryKey: ['users', 'me'],
  queryFn: async () => {
    const { data, error } = await api.users.me.get();
    if (error || !data) {
      throw new Error('Unauthorized');
    }
    return data;
  },
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery(adminGuardQueryOptions);
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
