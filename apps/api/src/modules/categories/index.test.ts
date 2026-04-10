import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { categoriesRoutes } from '.'

const app = new Elysia().use(categoriesRoutes)
const client = treaty(app)

describe('GET /categories', () => {
  it('returns 200 with an array', async () => {
    const { data, error } = await client.categories.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each item has categoryId, name, and description fields', async () => {
    const { data } = await client.categories.get()
    for (const item of data!) {
      expect(typeof item.categoryId).toBe('string')
      expect(typeof item.name).toBe('string')
      expect('description' in item).toBe(true)
    }
  })

  it('does not return soft-deleted categories', async () => {
    const { data } = await client.categories.get()
    for (const item of data!) {
      expect(item).not.toHaveProperty('deletedAt')
    }
  })
})
