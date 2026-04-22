import { mock, describe, it, expect, beforeAll } from 'bun:test'

// Mock MinIO storage BEFORE any module that imports it is resolved.
// Bun hoists mock.module calls, so this intercepts the transitive import
// from imagesRoutes → index.ts → storage.ts
mock.module('../../storage', () => ({
  uploadImage: async (_file: File, profileId: string) =>
    `http://localhost:9000/marketplace/profiles/${profileId}/test.jpg`,
  initBucket:  async () => {},
  minioClient: {},
}))

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

const fakeJpeg = new File(
  [Buffer.from([0xff, 0xd8, 0xff, 0xe0])], // minimal JPEG magic bytes
  'photo.jpg',
  { type: 'image/jpeg' },
)

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
      { file: fakeJpeg },
    )
    expect(error?.status).toBe(401)
  })

  it('returns 403 when adding image to a profile not owned by the user', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).images.post(
      { file: fakeJpeg },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 201 with the created image', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).images.post(
      { file: fakeJpeg },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
    expect(data!.link).toContain(aliceProfileId)
    expect(data!.userProfileId).toBe(aliceProfileId)
    expect(data!.name).toBe('photo.jpg')
    testImageId = data!.imageId
  })

  it('image appears in GET /profiles/:id/images', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).images.get()
    const found = data!.find(img => img.imageId === testImageId)
    expect(found).toBeDefined()
    expect(found!.link).toContain(aliceProfileId)
  })
})

describe('DELETE /images/:id', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.images({ id: testImageId }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 404 when deleting a non-existent image', async () => {
    const { error } = await client.images({ id: '00000000-0000-0000-0000-000000000000' }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(404)
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
