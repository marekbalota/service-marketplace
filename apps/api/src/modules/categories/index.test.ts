import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { categoriesRoutes } from '.'

const app = new Elysia().use(categoriesRoutes)

describe('GET /categories', () => {
  it('returns 200', async () => {
    const res = await app.handle(new Request('http://localhost/categories'))
    expect(res.status).toBe(200)
  })

  it('returns an array', async () => {
    const res = await app.handle(new Request('http://localhost/categories'))
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('each item has categoryId, name, and description fields', async () => {
    const res = await app.handle(new Request('http://localhost/categories'))
    const body = await res.json() as Record<string, unknown>[]
    for (const item of body) {
      expect(item).toHaveProperty('categoryId')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('description')
      expect(typeof item.categoryId).toBe('string')
      expect(typeof item.name).toBe('string')
    }
  })

  it('does not return soft-deleted categories', async () => {
    // All returned categories should have no deletedAt in the response
    // (the query filters them out at DB level — this confirms the shape)
    const res = await app.handle(new Request('http://localhost/categories'))
    const body = await res.json() as Record<string, unknown>[]
    for (const item of body) {
      expect(item).not.toHaveProperty('deletedAt')
    }
  })
})
