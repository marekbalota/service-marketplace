import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminCategoriesRoutes } from '.'
import { authRoutes } from '../../auth'
import { auth } from '../../auth/service'
import { errorsPlugin } from '../../../lib/errors'

const app = new Elysia().use(errorsPlugin).use(authRoutes).use(adminCategoriesRoutes)
const client = treaty(app)

const suffix = Date.now()
const enName = `ZZZ Test EN ${suffix}`
const enRenamed = `ZZZ Test EN Renamed ${suffix}`
const skName = `ZZZ Test SK ${suffix}`

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
    expect(typeof cat.translations).toBe('object')
    expect('en' in cat.translations).toBe(true)
    expect(typeof cat.activePosts).toBe('number')
    expect(typeof cat.archivedPosts).toBe('number')
  })

  it('returns filtered results when search is provided', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { search: 'Tutoring' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(
      data!.items.every((c) =>
        Object.values(c.translations).some((name) => name.toLowerCase().includes('tutoring')),
      ),
    ).toBe(true)
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

describe('GET /admin/categories — sort and filter', () => {
  it('sorts by activePosts descending', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { sortBy: 'activePosts', sortOrder: 'desc' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    const counts = data!.items.map((c) => c.activePosts)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]!).toBeLessThanOrEqual(counts[i - 1]!)
    }
  })

  it('sorts by name descending', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { sortBy: 'name', sortOrder: 'desc' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    const names = data!.items.map((c) => (c.translations['en'] ?? '').toLowerCase())
    for (let i = 1; i < names.length; i++) {
      expect(names[i]!.localeCompare(names[i - 1]!)).toBeLessThanOrEqual(0)
    }
  })

  it('returns only complete categories when translationFilter=complete', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { translationFilter: 'complete', size: 50 },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    const supported = ['en', 'sk', 'cs']
    data!.items.forEach((c) => {
      supported.forEach((locale) => {
        expect(locale in c.translations).toBe(true)
      })
    })
  })

  it('returns only incomplete categories when translationFilter=incomplete', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { translationFilter: 'incomplete', size: 50 },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    const supported = ['en', 'sk', 'cs']
    data!.items.forEach((c) => {
      const hasAll = supported.every((locale) => locale in c.translations)
      expect(hasAll).toBe(false)
    })
  })

  it('returns only categories missing SK when translationFilter=sk', async () => {
    const { data, error } = await client.admin.categories.get({
      query: { translationFilter: 'sk', size: 50 },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    data!.items.forEach((c) => {
      expect('sk' in c.translations).toBe(false)
    })
  })
})

describe('POST /admin/categories', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.categories.post({
      translations: [{ locale: 'en', name: 'TestCat' }],
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin.categories.post(
      { translations: { en: 'TestCat' } },
      { headers: { Cookie: userCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 422 when EN translation is missing', async () => {
    const { error } = await client.admin.categories.post(
      { translations: { sk: skName } },
      { headers: { Cookie: adminCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('creates a category with EN only and returns 201', async () => {
    const { data, error } = await client.admin.categories.post(
      { translations: { en: enName } },
      { headers: { Cookie: adminCookie } },
    )
    expect(error).toBeNull()
    expect(data!.translations['en']).toBe(enName)
    createdId = data!.categoryId
  })

  it('returns 409 when EN name already exists', async () => {
    const { error } = await client.admin.categories.post(
      { translations: { en: 'Tutoring' } },
      { headers: { Cookie: adminCookie } },
    )
    expect(error?.status).toBe(409)
  })

  it('returns 409 when SK name conflicts with another category', async () => {
    const { data: existing } = await client.admin.categories.post(
      {
        translations: { en: `${enName} SK Conflict Base`, sk: `${skName} Conflict` },
      },
      { headers: { Cookie: adminCookie } },
    )
    const { error } = await client.admin.categories.post(
      {
        translations: { en: `${enName} SK Conflict Dup`, sk: `${skName} Conflict` },
      },
      { headers: { Cookie: adminCookie } },
    )
    expect(error?.status).toBe(409)
    if (existing?.categoryId) {
      await client.admin
        .categories({ id: existing.categoryId })
        .delete(undefined, { headers: { Cookie: adminCookie } })
    }
  })
})

describe('PATCH /admin/categories/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin
      .categories({ id: 'some-id' })
      .patch({ translations: { en: 'X' } })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a user without permission', async () => {
    const { error } = await client.admin
      .categories({ id: 'some-id' })
      .patch({ translations: [{ locale: 'en', name: 'X' }] }, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a non-existent id', async () => {
    const { error } = await client.admin
      .categories({ id: '00000000-0000-0000-0000-000000000000' })
      .patch({ translations: [{ locale: 'en', name: 'X' }] }, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('returns 422 when unsupported locale is provided', async () => {
    const { error } = await client.admin
      .categories({ id: createdId })
      .patch(
        { translations: { xx: 'SomeUnsupportedValue' } },
        { headers: { Cookie: adminCookie } },
      )
    expect(error?.status).toBe(422)
  })

  it('updates EN name', async () => {
    const { data, error } = await client.admin
      .categories({ id: createdId })
      .patch({ translations: { en: enRenamed } }, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()
    expect(data!.translations['en']).toBe(enRenamed)
  })

  it('adds SK translation without touching EN', async () => {
    const { data, error } = await client.admin
      .categories({ id: createdId })
      .patch({ translations: { sk: skName } }, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()
    expect(data!.translations['sk']).toBe(skName)
    expect(data!.translations['en']).toBe(enRenamed)
  })

  it('returns 409 when EN name conflicts with another category', async () => {
    const { error } = await client.admin
      .categories({ id: createdId })
      .patch({ translations: { en: 'Plumbing' } }, { headers: { Cookie: adminCookie } })
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
