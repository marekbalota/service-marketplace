import { Elysia, t } from 'elysia';
import { AdminPostsService } from './service';
import { authRoutes } from '../../auth';
import { Permissions } from '@marketplace/shared';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from '../../../lib/errors';

export const adminPostsRoutes = new Elysia({ prefix: '/admin/posts' })
  .use(authRoutes)
  .delete(
    '/:id',
    async ({ params, body, set }) => {
      await AdminPostsService.deleteAny(params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.PostsDeleteAny,
      params: t.Object({ id: t.String() }),
      body: t.Object({ reason: t.Optional(t.String()) }),
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Admin delete any post', operationId: 'adminDeletePost', tags: ['Admin'] },
    },
  );
