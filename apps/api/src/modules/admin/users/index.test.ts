import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { treaty } from '@elysiajs/eden';
import { adminUsersRoutes } from '.';
import { authRoutes } from '../../auth';
import { usersRoutes } from '../../users';
import { auth } from '../../auth/service';

const app = new Elysia().use(authRoutes).use(usersRoutes).use(adminUsersRoutes);
const client = treaty(app);

let adminCookie: string;
let userCookie: string;
let regularUserId: string;

beforeAll(async () => {
  // Sign in as admin (admin@example.com - SuperAdmin role)
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  });
  adminCookie = adminRes.headers.get('set-cookie') ?? '';

  // Sign in as regular user (alice@example.com - user role, no admin permissions)
  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  });
  userCookie = userRes.headers.get('set-cookie') ?? '';

  // Get the regular user's ID from /users/me
  const meRes = await app.handle(new Request('http://localhost/users/me', {
    headers: { Cookie: userCookie },
  }));
  const meData = await meRes.json() as { userId: string };
  regularUserId = meData.userId;
});

describe('GET /admin/users', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users.get();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users.get({
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });

  it('returns 200 with user list for admin', async () => {
    const { data, error } = await client['admin'].users.get({
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data!.items)).toBe(true);
    expect(typeof data!.total).toBe('number');
    expect(typeof data!.totalPages).toBe('number');

    // Check user structure
    if (data && data.items.length > 0) {
      const user = data.items[0];
      expect(user).toBeTruthy();
      expect(typeof user!.userId).toBe('string');
      expect(typeof user!.name).toBe('string');
      expect(typeof user!.email).toBe('string');
      expect(typeof user!.isBanned).toBe('boolean');
      // role is an object with roleId, name, priority or null
      expect(user!.role === null || typeof user!.role === 'object').toBe(true);
      if (user!.role) {
        expect(typeof user!.role.roleId).toBe('string');
        expect(typeof user!.role.name).toBe('string');
        expect(typeof user!.role.priority).toBe('number');
      }
    }
  });

  it('supports search query param', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { search: 'alice' },
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    // Should return results or empty array
    expect(Array.isArray(data!.items)).toBe(true);
  });

  it('supports pagination', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { size: 2, offset: 0 },
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(data!.items.length).toBeLessThanOrEqual(2);
  });

  it('supports sorting', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { sort: 'name' },
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(Array.isArray(data!.items)).toBe(true);
  });
});

describe('GET /admin/users/roles/assignable', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users.roles.assignable.get();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users.roles.assignable.get({
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });

  it('returns 200 with roles for admin', async () => {
    const { data, error } = await client['admin'].users.roles.assignable.get({
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('PATCH /admin/users/:id/ban', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).ban.patch({
      reason: 'Test ban',
    });
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).ban.patch(
      { reason: 'Test ban' },
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });

  it('returns 422 for missing reason', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin'].users({ id: regularUserId }).ban.patch(
      {} as any,
      { headers: { Cookie: adminCookie } },
    );
    expect(error?.status).toBe(422);
  });
});

describe('PATCH /admin/users/:id/unban', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).unban.patch();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).unban.patch(undefined, {
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });
});

describe('PATCH /admin/users/:id/role', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).role.patch({
      roleId: '00000000-0000-0000-0000-000000000000',
    });
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).role.patch(
      { roleId: '00000000-0000-0000-0000-000000000000' },
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });

  it('returns 422 for missing roleId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin'].users({ id: regularUserId }).role.patch(
      {} as any,
      { headers: { Cookie: adminCookie } },
    );
    expect(error?.status).toBe(422);
  });

  it('returns 404 for unknown user id', async () => {
    const { error } = await client['admin'].users({ id: '00000000-0000-0000-0000-000000000000' }).role.patch(
      { roleId: '00000000-0000-0000-0000-000000000000' },
      { headers: { Cookie: adminCookie } },
    );
    expect(error).toBeTruthy();
    expect(error!.status).toBe(404);
  });
});
