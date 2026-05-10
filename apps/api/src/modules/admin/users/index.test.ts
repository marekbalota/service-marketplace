import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminUsersRoutes } from '.'
import { authRoutes } from '../../auth'
import { usersRoutes } from '../../users'
import { auth } from '../../auth/service'

const app = new Elysia().use(authRoutes).use(usersRoutes).use(adminUsersRoutes)
const client = treaty(app)

let adminCookie: string
let userCookie: string
let regularUserId: string
let banTargetUserId: string

beforeAll(async () => {
  // Sign in as admin (admin@example.com - SuperAdmin role)
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = adminRes.headers.get('set-cookie') ?? ''

  // Sign in as regular user (alice@example.com - user role, no admin permissions)
  // alice is used only for 401/403 checks; her session must remain valid throughout.
  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  userCookie = userRes.headers.get('set-cookie') ?? ''

  // Get alice's user ID from /users/me using Eden Treaty
  const { data: meData } = await client.users.me.get({ headers: { Cookie: userCookie } })
  regularUserId = meData!.userId

  // Sign in as bob — used as the ban/unban target so alice's session is never invalidated
  const bobRes = await auth.api.signInEmail({
    body: { email: 'bob@example.com', password: 'password123' },
    asResponse: true,
  })
  const bobCookie = bobRes.headers.get('set-cookie') ?? ''
  const { data: bobData } = await client.users.me.get({ headers: { Cookie: bobCookie } })
  banTargetUserId = bobData!.userId
})

describe('GET /admin/users', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users.get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users.get({
      headers: { Cookie: userCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with user list for admin', async () => {
    const { data, error } = await client['admin'].users.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPages).toBe('number')

    // Check user structure
    if (data && data.items.length > 0) {
      const user = data.items[0]
      expect(user).toBeTruthy()
      expect(typeof user!.userId).toBe('string')
      expect(typeof user!.name).toBe('string')
      expect(typeof user!.email).toBe('string')
      expect(typeof user!.isBanned).toBe('boolean')
      // role is an object with roleId, name, priority or null
      expect(user!.role === null || typeof user!.role === 'object').toBe(true)
      if (user!.role) {
        expect(typeof user!.role.roleId).toBe('string')
        expect(typeof user!.role.name).toBe('string')
        expect(typeof user!.role.priority).toBe('number')
      }
    }
  })

  it('supports search query param', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { search: 'alice' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    // Should return results or empty array
    expect(Array.isArray(data!.items)).toBe(true)
  })

  it('supports pagination', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { size: 2, offset: 0 },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.length).toBeLessThanOrEqual(2)
  })

  it('supports sorting', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { sort: 'name' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
  })

  it('returns totalBanned in response', async () => {
    const { data, error } = await client['admin'].users.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(typeof data!.totalBanned).toBe('number')
    expect(data!.totalBanned).toBeGreaterThanOrEqual(0)
    expect(data!.totalBanned).toBeLessThanOrEqual(data!.total)
  })

  it('supports isBanned filter — returns only banned users', async () => {
    // Ensure at least one banned user exists
    await client['admin']
      .users({ id: banTargetUserId })
      .ban.patch({ reason: 'Filter test ban' }, { headers: { Cookie: adminCookie } })

    const { data, error } = await client['admin'].users.get({
      query: { isBanned: true },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.every((u) => u.isBanned)).toBe(true)
    expect(data!.totalBanned).toBe(data!.total)

    // Clean up — unban bob
    await client['admin'].users({ id: banTargetUserId }).unban.patch(undefined, {
      headers: { Cookie: adminCookie },
    })
  })

  it('supports isBanned filter — returns only active users', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { isBanned: false },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.every((u) => !u.isBanned)).toBe(true)
    expect(data!.totalBanned).toBeGreaterThanOrEqual(0)
  })

  it('supports role filter', async () => {
    const { data, error } = await client['admin'].users.get({
      query: { role: 'SuperAdmin' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    // All returned users should have the SuperAdmin role
    data!.items.forEach((u) => {
      expect(u.role?.name).toBe('SuperAdmin')
    })
  })
})

describe('PATCH /admin/users/:id/ban', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).ban.patch({
      reason: 'Test ban',
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin']
      .users({ id: regularUserId })
      .ban.patch({ reason: 'Test ban' }, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 422 for missing reason', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin']
      .users({ id: regularUserId })
      .ban.patch({} as any, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(422)
  })

  it('bans user and returns 204, user appears as banned in the list', async () => {
    const { error } = await client['admin']
      .users({ id: banTargetUserId })
      .ban.patch({ reason: 'Integration test ban' }, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()

    const { data } = await client['admin'].users.get({
      query: { size: 100 },
      headers: { Cookie: adminCookie },
    })
    const bannedUser = data!.items.find((u) => u.userId === banTargetUserId)
    expect(bannedUser!.isBanned).toBe(true)
    expect(bannedUser!.banReason).toBe('Integration test ban')
  })
})

describe('PATCH /admin/users/:id/unban', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).unban.patch()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).unban.patch(undefined, {
      headers: { Cookie: userCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('unbans user and returns 204, user appears as not banned in the list', async () => {
    // Ensure bob is banned before we unban (carries over from the ban happy-path test above)
    await client['admin']
      .users({ id: banTargetUserId })
      .ban.patch({ reason: 'Pre-unban setup' }, { headers: { Cookie: adminCookie } })

    const { error } = await client['admin'].users({ id: banTargetUserId }).unban.patch(undefined, {
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()

    const { data } = await client['admin'].users.get({
      query: { size: 100 },
      headers: { Cookie: adminCookie },
    })
    const unbannedUser = data!.items.find((u) => u.userId === banTargetUserId)
    expect(unbannedUser!.isBanned).toBe(false)
  })
})

describe('PATCH /admin/users/:id/role', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).role.patch({
      roleId: '00000000-0000-0000-0000-000000000000',
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin']
      .users({ id: regularUserId })
      .role.patch(
        { roleId: '00000000-0000-0000-0000-000000000000' },
        { headers: { Cookie: userCookie } },
      )
    expect(error?.status).toBe(403)
  })

  it('returns 422 for missing roleId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin']
      .users({ id: regularUserId })
      .role.patch({} as any, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(422)
  })

  it('returns 404 for unknown user id', async () => {
    const { error } = await client['admin']
      .users({ id: '00000000-0000-0000-0000-000000000000' })
      .role.patch(
        { roleId: '00000000-0000-0000-0000-000000000000' },
        { headers: { Cookie: adminCookie } },
      )
    expect(error).toBeTruthy()
    expect(error!.status).toBe(404)
  })
})

describe('GET /admin/users/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).get({
      headers: { Cookie: userCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with user details for admin', async () => {
    const { data, error } = await client['admin'].users({ id: regularUserId }).get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.userId).toBe(regularUserId)
    expect(typeof data!.name).toBe('string')
    expect(typeof data!.email).toBe('string')
    expect(typeof data!.isBanned).toBe('boolean')
  })

  it('returns 404 for unknown user id', async () => {
    const { error } = await client['admin']
      .users({ id: '00000000-0000-0000-0000-000000000000' })
      .get({
        headers: { Cookie: adminCookie },
      })
    expect(error?.status).toBe(404)
  })
})

describe('GET /admin/users/:id/profiles', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).profiles.get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client['admin'].users({ id: regularUserId }).profiles.get({
      headers: { Cookie: userCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with profiles array for admin', async () => {
    const { data, error } = await client['admin'].users({ id: regularUserId }).profiles.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
