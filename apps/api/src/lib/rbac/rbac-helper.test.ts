import { describe, it, expect } from 'bun:test'
import { RBACService } from './rbac-helper'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

describe('RBACService.getUserPermissions', () => {
  it('returns an array of permission name strings for a user with a role', async () => {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@example.com'),
    })
    expect(adminUser).toBeTruthy()

    const perms = await RBACService.getUserPermissions(adminUser!.id)
    expect(Array.isArray(perms)).toBe(true)
    expect(perms.length).toBeGreaterThan(0)
    for (const p of perms) {
      expect(typeof p).toBe('string')
    }
  })

  it('returns an empty array for a user with no role', async () => {
    const perms = await RBACService.getUserPermissions('00000000-0000-0000-0000-000000000000')
    expect(perms).toEqual([])
  })
})

describe('RBACService.canManageRole', () => {
  it('returns false when either role ID does not exist', async () => {
    const result = await RBACService.canManageRole(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    )
    expect(result).toBe(false)
  })

  it('returns true when requester has strictly higher priority than target', async () => {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@example.com'),
      with: { role: true },
    })
    const regularUser = await db.query.users.findFirst({
      where: eq(users.email, 'alice@example.com'),
      with: { role: true },
    })
    expect(adminUser?.role).toBeTruthy()
    expect(regularUser?.role).toBeTruthy()

    const result = await RBACService.canManageRole(
      adminUser!.role!.roleId,
      regularUser!.role!.roleId,
    )
    expect(result).toBe(true)
  })

  it('returns false when requester and target have the same role', async () => {
    const user = await db.query.users.findFirst({
      where: eq(users.email, 'alice@example.com'),
      with: { role: true },
    })
    expect(user?.role).toBeTruthy()

    const result = await RBACService.canManageRole(user!.role!.roleId, user!.role!.roleId)
    expect(result).toBe(false)
  })
})

describe('RBACService.getRolePriority', () => {
  it('returns null for a non-existent role ID', async () => {
    const priority = await RBACService.getRolePriority('00000000-0000-0000-0000-000000000000')
    expect(priority).toBeNull()
  })

  it('returns a number for an existing role', async () => {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@example.com'),
      with: { role: true },
    })
    expect(adminUser?.role).toBeTruthy()

    const priority = await RBACService.getRolePriority(adminUser!.role!.roleId)
    expect(typeof priority).toBe('number')
  })
})
