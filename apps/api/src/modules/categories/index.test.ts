import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { categoriesRoutes } from '.'
import { db } from '../../db'
import { categories, categoryTranslations } from '../../db/schema'
import { eq } from 'drizzle-orm'

const app = new Elysia().use(categoriesRoutes)
const client = treaty(app)

let testCategoryId: string

beforeAll(async () => {
  const [cat] = await db.insert(categories).values({}).returning()
  testCategoryId = cat!.categoryId
  await db.insert(categoryTranslations).values([
    { categoryId: testCategoryId, locale: 'en', name: 'ZZZ Test EN' },
    { categoryId: testCategoryId, locale: 'sk', name: 'ZZZ Test SK' },
  ])
})

afterAll(async () => {
  await db.delete(categories).where(eq(categories.categoryId, testCategoryId))
})

describe('GET /categories', () => {
  it('returns 200 with an array', async () => {
    const { data, error } = await client.categories.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each item has categoryId and name fields', async () => {
    const { data } = await client.categories.get()
    for (const item of data!) {
      expect(typeof item.categoryId).toBe('string')
      expect(typeof item.name).toBe('string')
    }
  })

  it('returns SK name when Accept-Language: sk', async () => {
    const { data } = await client.categories.get({
      headers: { 'accept-language': 'sk' },
    })
    const item = data!.find((c) => c.categoryId === testCategoryId)
    expect(item?.name).toBe('ZZZ Test SK')
  })

  it('strips region code — sk-SK returns Slovak name', async () => {
    const { data } = await client.categories.get({
      headers: { 'accept-language': 'sk-SK' },
    })
    const item = data!.find((c) => c.categoryId === testCategoryId)
    expect(item?.name).toBe('ZZZ Test SK')
  })

  it('falls back to EN for unsupported locale', async () => {
    const { data } = await client.categories.get({
      headers: { 'accept-language': 'de' },
    })
    const item = data!.find((c) => c.categoryId === testCategoryId)
    expect(item?.name).toBe('ZZZ Test EN')
  })

  it('falls back to EN when no header', async () => {
    const { data } = await client.categories.get()
    const item = data!.find((c) => c.categoryId === testCategoryId)
    expect(item?.name).toBe('ZZZ Test EN')
  })

  it('falls back to EN when CS translation is missing', async () => {
    const { data } = await client.categories.get({
      headers: { 'accept-language': 'cs' },
    })
    const item = data!.find((c) => c.categoryId === testCategoryId)
    expect(item?.name).toBe('ZZZ Test EN')
  })
})
