import { describe, it, expect, mock } from 'bun:test'
import { favouritesRoutes } from './index'

describe('favourites routes', () => {
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

  describe('GET /favourites', () => {
    it('returns 401 when not authenticated', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          findAllForAccount: async () => ({ items: [mockPost], total: 1 }),
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites'),
      )
      expect(response.status).toBe(401)
    })
  })

  describe('POST /favourites/:postId', () => {
    it('returns 401 when not authenticated', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          addFavouriteForAccount: async () => ({
            userProfileId: 'profile-123',
            postId: 'post-123',
            createdAt: new Date(),
          }),
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/post-123', { method: 'POST' }),
      )
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /favourites/:postId', () => {
    it('returns 401 when not authenticated', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          removeFavouriteForAccount: async () => undefined,
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/post-123', { method: 'DELETE' }),
      )
      expect(response.status).toBe(401)
    })
  })

  describe('GET /favourites/:postId', () => {
    it('returns 401 when not authenticated', async () => {
      mock.module('./service', () => ({
        FavouritesService: {
          isFavouriteForAccount: async () => ({ isFavourite: true }),
        },
      }))

      const response = await favouritesRoutes.handle(
        new Request('http://localhost:3001/favourites/post-123'),
      )
      expect(response.status).toBe(401)
    })
  })
})
