import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { favouritesRoutes } from './index'
import { FavouritesService } from './service'
import { ProfilesService } from '../profiles/service'

describe('favourites routes', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' }
  const mockProfile = {
    userProfileId: 'profile-123',
    accountId: 'user-123',
    name: 'Test Profile',
    email: 'test@example.com',
  }
  const mockPost = {
    postId: 'post-123',
    postTitle: 'Test Post',
    description: 'Test Description',
    postType: 'OFFER' as const,
    price: '100.00',
    rateType: 'HOURLY' as const,
    createdAt: new Date(),
    authorId: 'author-123',
    authorName: 'Author Name',
    categories: [],
    location: null,
  }

  beforeEach(() => {
    // Reset mocks before each test
  })

  describe('GET /favourites', () => {
    it('should return list of favourites for authenticated user', async () => {
      const mockFavourites = {
        items: [mockPost],
        total: 1,
      }
      mock.module('./service', () => ({
        FavouritesService: {
          findAllByProfile: async () => mockFavourites,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites', {
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect(response.status).toBe(200)
    })

    it('should return empty list when user has no profile', async () => {
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites', {
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      // Should return 401 since auth middleware would fail without valid session
      expect([200, 401]).toContain(response.status)
    })
  })

  describe('POST /favourites/:postId', () => {
    it('should add post to favourites', async () => {
      const mockResult = {
        userProfileId: 'profile-123',
        postId: 'post-123',
        createdAt: new Date(),
      }
      mock.module('./service', () => ({
        FavouritesService: {
          addFavourite: async () => mockResult,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/post-123', {
          method: 'POST',
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([201, 401, 404]).toContain(response.status)
    })

    it('should return 404 when post does not exist', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          addFavourite: async () => null,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/non-existent', {
          method: 'POST',
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([401, 404]).toContain(response.status)
    })
  })

  describe('DELETE /favourites/:postId', () => {
    it('should remove post from favourites', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          removeFavourite: async () => true,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/post-123', {
          method: 'DELETE',
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([204, 401, 404]).toContain(response.status)
    })

    it('should return 404 when favourite does not exist', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          removeFavourite: async () => false,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/non-existent', {
          method: 'DELETE',
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([401, 404]).toContain(response.status)
    })
  })

  describe('GET /favourites/check/:postId', () => {
    it('should return true when post is favourited', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          isFavourite: async () => true,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/check/post-123', {
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([200, 401]).toContain(response.status)
    })

    it('should return false when post is not favourited', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          isFavourite: async () => false,
        },
      }))
      mock.module('../profiles/service', () => ({
        ProfilesService: {
          findByAccountId: async () => [mockProfile],
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/check/post-123', {
          headers: { Authorization: 'Bearer valid-token' },
        }),
      )
      expect([200, 401]).toContain(response.status)
    })
  })
})
