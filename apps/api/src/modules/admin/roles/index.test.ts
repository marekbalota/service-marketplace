import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { treaty } from '@elysiajs/eden';
import { adminRolesRoutes } from '.';
import { authRoutes } from '../../auth';
import { auth } from '../../auth/service';

const app = new Elysia().use(authRoutes).use(adminRolesRoutes);
const client = treaty(app);

let adminCookie: string;
let userCookie: string;

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
});

describe('GET /admin/roles', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles.get();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles.get({
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });

  it('returns 200 with array of roles for admin', async () => {
    const { data, error } = await client['admin'].roles.get({
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);

    // Check role structure
    const role = data![0];
    expect(typeof role.roleId).toBe('string');
    expect(typeof role.name).toBe('string');
    expect(typeof role.priority).toBe('number');
    expect(typeof role.isDefault).toBe('boolean');
    expect(Array.isArray(role.permissions)).toBe(true);
  });
});

describe('GET /admin/roles/permissions', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles.permissions.get();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles.permissions.get({
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });

  it('returns 200 with array of permissions for admin', async () => {
    const { data, error } = await client['admin'].roles.permissions.get({
      headers: { Cookie: adminCookie },
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);

    // Check permission structure
    const perm = data![0];
    expect(typeof perm.permissionId).toBe('string');
    expect(typeof perm.name).toBe('string');
    expect('description' in perm).toBe(true);
  });
});

describe('POST /admin/roles', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles.post({
      name: 'TestRole',
      permissionIds: [],
    });
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles.post(
      { name: 'TestRole', permissionIds: [] },
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });

  it('creates a role and returns 201 for admin', async () => {
    const testRoleName = `TestRole-${Date.now()}`;
    const { data, error } = await client['admin'].roles.post(
      { name: testRoleName, description: 'Test role', permissionIds: [] },
      { headers: { Cookie: adminCookie } },
    );
    expect(error).toBeNull();
    expect(data!.name).toBe(testRoleName);
    expect(typeof data!.roleId).toBe('string');
  });

  it('returns 422 for invalid body (missing name)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin'].roles.post(
      { permissionIds: [] } as any,
      { headers: { Cookie: adminCookie } },
    );
    expect(error?.status).toBe(422);
  });
});

describe('PATCH /admin/roles/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).patch({
      name: 'Updated',
    });
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).patch(
      { name: 'Updated' },
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });

  it('returns 404 for unknown role id', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).patch(
      { name: 'Updated' },
      { headers: { Cookie: adminCookie } },
    );
    expect(error?.status).toBe(404);
  });
});

describe('DELETE /admin/roles/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).delete();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).delete(undefined, {
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });
});

describe('POST /admin/roles/reorder', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles.reorder.post({
      roleId: '00000000-0000-0000-0000-000000000000',
      newPriority: 1,
    });
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user without reorder permission', async () => {
    const { error } = await client['admin'].roles.reorder.post(
      { roleId: '00000000-0000-0000-0000-000000000000', newPriority: 1 },
      { headers: { Cookie: userCookie } },
    );
    expect(error?.status).toBe(403);
  });
});

describe('POST /admin/roles/:id/default', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).default.post();
    expect(error?.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].roles({ id: '00000000-0000-0000-0000-000000000000' }).default.post(undefined, {
      headers: { Cookie: userCookie },
    });
    expect(error?.status).toBe(403);
  });
});
