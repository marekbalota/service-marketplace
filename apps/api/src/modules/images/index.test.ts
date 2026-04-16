import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { imagesRoutes } from '.'
import { authRoutes } from '../auth'
import { profilesRoutes } from '../profiles'
import { auth } from '../auth/service'

const app = new Elysia().use(authRoutes).use(profilesRoutes).use(imagesRoutes)
const client = treaty(app)

let aliceCookie: string
let aliceProfileId: string
let testImageId: string

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data } = await client.profiles.me.get({ headers: { Cookie: aliceCookie } })
  const aliceProfile = data?.find(p => p.name === 'Alice Johnson') ?? data?.[0]
  aliceProfileId = aliceProfile?.userProfileId ?? ''
})

describe('GET /profiles/:id/images', () => {
  it('returns 200 with an array', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).images.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('returns 200 with empty array for unknown profile', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).images.get()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})

describe('POST /profiles/:id/images', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).images.post(
      { link: 'https://example.com/img.jpg' },
    )
    expect(error?.status).toBe(401)
  })

  it('returns 403 when adding image to a profile not owned by the user', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).images.post(
      { link: 'https://example.com/img.jpg' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 422 for empty link', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).images.post(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { link: '' } as any,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('returns 201 with the created image', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).images.post(
      { link: 'https://example.com/test-image.jpg' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
    expect(data!.link).toBe('https://example.com/test-image.jpg')
    expect(data!.userProfileId).toBe(aliceProfileId)
    testImageId = data!.imageId
  })

  it('image appears in GET /profiles/:id/images', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).images.get()
    const found = data!.find(img => img.imageId === testImageId)
    expect(found).toBeDefined()
    expect(found!.link).toBe('https://example.com/test-image.jpg')
  })
})

describe('DELETE /images/:id', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.images({ id: testImageId }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 403 when deleting an image not owned by the user', async () => {
    const { error } = await client.images({ id: '00000000-0000-0000-0000-000000000000' }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 204 and soft-deletes the image', async () => {
    const { error } = await client.images({ id: testImageId }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()

    const { data } = await client.profiles({ id: aliceProfileId }).images.get()
    const found = data!.find(img => img.imageId === testImageId)
    expect(found).toBeUndefined()
  })
})
