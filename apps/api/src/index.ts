// Export admin model types for frontend consumption
export type { AdminRolesModel } from './modules/admin/roles/model'
export type { AdminUsersModel } from './modules/admin/users/model'
export type { AdminReportsModel } from './modules/admin/reports/model'

import { env } from './lib/env'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { authRoutes } from './modules/auth'
import { logger } from './lib/logger'
import { postsRoutes } from './modules/posts'
import { categoriesRoutes } from './modules/categories'
import { profilesRoutes } from './modules/profiles'
import { imagesRoutes } from './modules/images'
import { usersRoutes } from './modules/users'
import { adminRolesRoutes } from './modules/admin/roles'
import { adminUsersRoutes } from './modules/admin/users'
import { adminPostsRoutes } from './modules/admin/posts'
import { adminReportsRoutes } from './modules/admin/reports'
import { errorsPlugin } from './lib/errors'
import { favouritesRoutes } from './modules/favourites'
import { messagesRoutes } from './modules/messages'
import { reviewsRoutes } from './modules/reviews'
import { reviewImagesRoutes } from './modules/review-images'
import { reportCategoriesRoutes } from './modules/reports'
import { initBucket } from './lib/storage'
import { locationsRoutes } from './modules/locations'

export const app = new Elysia()
  .use(errorsPlugin)
  .use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-captcha-response'],
      exposeHeaders: ['X-Retry-After'],
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Marketplace for Services API',
          version: '1.0.0',
          description:
            'REST API for a service marketplace where users post offers or requests for services, organised by category with reviews.',
        },
        servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
        tags: [
          { name: 'Posts', description: 'Service post listings (offers and requests)' },
          { name: 'Profiles', description: 'User profiles' },
          { name: 'Categories', description: 'Post categories' },
          { name: 'Images', description: 'Profile images' },
          { name: 'Admin', description: 'Admin operations' },
          { name: 'Favourites', description: "User's favourite posts" },
          { name: 'Messages', description: 'Message threads and chat messages' },
          { name: 'Reviews', description: 'Post reviews and ratings' },
          { name: 'Reports', description: 'Post reports' },
          { name: 'Locations', description: 'Distinct location values for filtering' },
        ],
      },
    }),
  )
  .use(logger)
  .get('/', () => 'Marketplace API')
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(reviewsRoutes)
  .use(reviewImagesRoutes)
  .use(categoriesRoutes)
  .use(profilesRoutes)
  .use(imagesRoutes)
  .use(adminRolesRoutes)
  .use(adminUsersRoutes)
  .use(adminPostsRoutes)
  .use(adminReportsRoutes)
  .use(favouritesRoutes)
  .use(messagesRoutes)
  .use(reportCategoriesRoutes)
  .use(locationsRoutes)
  .listen(3001)

initBucket().catch((err) => console.error('[MinIO] bucket init failed:', err))

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
