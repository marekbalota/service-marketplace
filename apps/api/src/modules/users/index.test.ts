import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { treaty } from '@elysiajs/eden';
import { usersRoutes } from '.';
import { authRoutes } from '../auth';
import { auth } from '../auth/service';

const app = new Elysia().use(authRoutes).use(usersRoutes);
const client = treaty(app);

let userCookie: string;
let userId: string;

beforeAll(async () => {
  // Sign in as regular user (alice@example.com)
  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  });
  userCookie = userRes.headers.get('set-cookie') ?? '';

  // Get the user's ID from /users/me using Eden Treaty
  const { data: meData } = await client.users.me.get({ headers: { Cookie: userCookie } });
  userId = meData!.userId;
});

describe('GET /users/me', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.users.me.get();
    expect(error?.status).toBe(401);
  });

  it('returns 200 with user data for authenticated user', async () => {
    const { data, error } = await client.users.me.get({
      headers: { Cookie: userCookie },
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(typeof data!.userId).toBe('string');
    expect(typeof data!.name).toBe('string');
    expect(typeof data!.email).toBe('string');
  });

  it('returns user with role information', async () => {
    const { data, error } = await client.users.me.get({
      headers: { Cookie: userCookie },
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // role can be null or an object with role info
    expect(data!.role === null || typeof data!.role === 'object').toBe(true);
    if (data!.role) {
      expect(typeof data!.role.roleId).toBe('string');
      expect(typeof data!.role.name).toBe('string');
      expect(typeof data!.role.priority).toBe('number');
      expect(Array.isArray(data!.role.permissions)).toBe(true);
    }
  });

  it('returns user with profiles array', async () => {
    const { data, error } = await client.users.me.get({
      headers: { Cookie: userCookie },
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Array.isArray(data!.profiles)).toBe(true);
    if (data!.profiles.length > 0) {
      const profile = data!.profiles[0];
      expect(profile).toBeTruthy();
      expect(typeof profile!.userProfileId).toBe('string');
      expect(typeof profile!.name).toBe('string');
      expect(typeof profile!.email).toBe('string');
    }
  });
});
