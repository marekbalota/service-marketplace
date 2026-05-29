import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminCategoriesRoutes } from '.'
import { authRoutes } from '../../auth'
import { auth } from '../../auth/service'
import { errorsPlugin } from '../../../lib/errors'

const app = new Elysia().use(errorsPlugin).use(authRoutes).use(adminCategoriesRoutes)
const client = treaty(app)

const uniqueSuffix = Date.now()
const testCategoryName = `ZZZ Test Category ${uniqueSuffix}`
const testCategoryRenamed = `ZZZ Test Category Renamed ${uniqueSuffix}`

let adminCookie: string
let userCookie: string
let createdId: string

beforeAll(async () => {
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = adminRes.headers.get('set-cookie') ?? ''

  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  userCookie = userRes.headers.get('set-cookie') ?? ''
})

afterAll(async () => {
  if (createdId) {
    await client.admin
      .categories({ id: createdId })
      .delete(undefined, { headers: { Cookie: adminCookie } })
  }
})

describe('GET /admin/categories', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.categories.get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin.categories.get({
      headers: { Cookie: userCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with paginated envelope for admin', async () => {
    const { data, error } = await client.admin.categories.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPages).toBe('number')
    expect(Array.isArray(data!.items)).toBe(true)
    expect(data!.items.length).toBeGreaterThan(0)
    const cat = data!.items[0]!
    expect(typeof cat.categoryId).toBe('string')
    expect(typeof cat.name).toBe('string')
    expect(typeof cat.activePosts).toBe('number')
    expect(typeof cat.archivedPosts).toBe('number')
  })

  it('returns filtered results when search is provided', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { search: 'Tutoring' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.every((c) => c.name.toLowerCase().includes('tutoring'))).toBe(true)
  })

  it('respects offset and size pagination', async () => {
    const { data: page1 } = await client.admin.categories.get({
      query: { offset: 0, size: 2 },
      headers: { Cookie: adminCookie },
    })
    const { data: page2 } = await client.admin.categories.get({
      query: { offset: 2, size: 2 },
      headers: { Cookie: adminCookie },
    })
    expect(page1!.items.length).toBeLessThanOrEqual(2)
    if (page1!.total > 2) {
      expect(page2!.items[0]?.categoryId).not.toBe(page1!.items[0]?.categoryId)
    }
  })
})

describe('POST /admin/categories', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.categories.post({ name: 'TestCat' })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin.categories.post(
      { name: 'TestCat' },
      { headers: { Cookie: userCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('creates a category and returns 201', async () => {
    const { data, error } = await client.admin.categories.post(
      { name: testCategoryName },
      { headers: { Cookie: adminCookie } },
    )
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.name).toBe(testCategoryName)
    createdId = data!.categoryId
  })

  it('returns 409 when name already exists', async () => {
    const { error } = await client.admin.categories.post(
      { name: 'Tutoring' },
      { headers: { Cookie: adminCookie } },
    )
    expect(error?.status).toBe(409)
  })
})

describe('PATCH /admin/categories/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.categories({ id: 'some-id' }).patch({ name: 'X' })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin
      .categories({ id: 'some-id' })
      .patch({ name: 'X' }, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a non-existent id', async () => {
    const { error } = await client.admin
      .categories({ id: '00000000-0000-0000-0000-000000000000' })
      .patch({ name: 'X' }, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('updates the category name and returns 200', async () => {
    const { data, error } = await client.admin
      .categories({ id: createdId })
      .patch({ name: testCategoryRenamed }, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()
    expect(data!.name).toBe(testCategoryRenamed)
  })

  it('returns 409 when name conflicts with another category', async () => {
    const { error } = await client.admin
      .categories({ id: createdId })
      .patch({ name: 'Plumbing' }, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(409)
  })
})

describe('DELETE /admin/categories/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.categories({ id: 'some-id' }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin
      .categories({ id: 'some-id' })
      .delete(undefined, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a non-existent id', async () => {
    const { error } = await client.admin
      .categories({ id: '00000000-0000-0000-0000-000000000000' })
      .delete(undefined, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('deletes the category and returns 204', async () => {
    const { error } = await client.admin
      .categories({ id: createdId })
      .delete(undefined, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()
    createdId = ''
  })
})
