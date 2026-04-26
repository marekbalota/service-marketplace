import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { treaty } from '@elysiajs/eden';
import { adminPostsRoutes } from '.';
import { postsRoutes } from '../../posts';
import { profilesRoutes } from '../../profiles';
import { usersRoutes } from '../../users';
import { authRoutes } from '../../auth';
import { auth } from '../../auth/service';
import { errorsPlugin } from '../../../lib/errors';

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(profilesRoutes)
  .use(adminPostsRoutes);
const client = treaty(app);

let adminCookie: string;
let userCookie: string;
let testPostId: string;
let authorProfileId: string;

beforeAll(async () => {
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  });
  adminCookie = adminRes.headers.get('set-cookie') ?? '';

  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  });
  userCookie = userRes.headers.get('set-cookie') ?? '';

  // Get alice's profile id using Eden Treaty
  const { data: meData } = await client.users.me.get({ headers: { Cookie: userCookie } });
  authorProfileId = meData!.profiles[0]?.userProfileId ?? '';

  // Create a post as alice to use as delete target
  const { data: created } = await client.posts.post(
    {
      authorId: authorProfileId,
      postTitle: 'Post to be admin-deleted',
      description: 'This post will be deleted by admin in tests',
      postType: 'OFFER',
    },
    { headers: { Cookie: userCookie } },
  );
  testPostId = (created as { postId: string }).postId;
});

describe('DELETE /admin/posts/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].posts({ id: testPostId }).delete(
      {},
      { headers: { Cookie: '' } },
    );
    expect(error?.status).toBe(401);
  });

  it('returns 403 for user without PostsDeleteAny', async () => {
    const { error } = await client['admin'].posts({ id: testPostId }).delete(
      {},
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });

  it('returns 404 for unknown post id', async () => {
    const { error } = await client['admin'].posts({ id: '00000000-0000-0000-0000-000000000000' }).delete(
      {},
      { headers: { Cookie: adminCookie } },
    );
    expect(error?.status).toBe(404);
  });

  it('soft-deletes any post and returns 204', async () => {
    const { error } = await client['admin'].posts({ id: testPostId }).delete(
      {},
      { headers: { Cookie: adminCookie } },
    );
    expect(error).toBeNull();

    // Confirm post is gone from public endpoint
    const { error: getError } = await client.posts({ id: testPostId }).get();
    expect(getError?.status).toBe(404);
  });

  it('accepts optional reason in body', async () => {
    // Create a fresh post for this test
    const { data: fresh } = await client.posts.post(
      {
        authorId: authorProfileId,
        postTitle: 'Post deleted with reason',
        description: 'This post will be deleted with a reason',
        postType: 'OFFER',
      },
      { headers: { Cookie: userCookie } },
    );
    const freshId = (fresh as { postId: string }).postId;

    const { error } = await client['admin'].posts({ id: freshId }).delete(
      { reason: 'Violates community guidelines' },
      { headers: { Cookie: adminCookie } },
    );
    expect(error).toBeNull();
  });
});
