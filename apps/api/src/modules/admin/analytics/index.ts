import { Elysia } from 'elysia'
import { AdminAnalyticsService } from './service'
import { AdminAnalyticsModel } from './model'
import { Permissions } from '@marketplace/shared'
import { authRoutes } from '../../auth'
import { forbiddenResponse, unauthorizedResponse } from '../../../lib/errors'

export const adminAnalyticsRoutes = new Elysia({ prefix: '/admin/analytics' })
  .use(authRoutes)
  .get(
    '/users',
    async ({ query }) =>
      AdminAnalyticsService.getAnalyticsUsers(query.from, query.to, query.granularity),
    {
      authWithPermissions: Permissions.AdminAnalyticsView,
      query: AdminAnalyticsModel.analyticsQuery,
      response: {
        200: AdminAnalyticsModel.analyticsResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'User registration analytics',
        operationId: 'getAnalyticsUsers',
        tags: ['Admin'],
      },
    },
  )
  .get(
    '/posts',
    async ({ query }) =>
      AdminAnalyticsService.getAnalyticsPosts(query.from, query.to, query.granularity),
    {
      authWithPermissions: Permissions.AdminAnalyticsView,
      query: AdminAnalyticsModel.analyticsQuery,
      response: {
        200: AdminAnalyticsModel.analyticsResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Post creation analytics',
        operationId: 'getAnalyticsPosts',
        tags: ['Admin'],
      },
    },
  )
  .get(
    '/messages',
    async ({ query }) =>
      AdminAnalyticsService.getAnalyticsMessages(query.from, query.to, query.granularity),
    {
      authWithPermissions: Permissions.AdminAnalyticsView,
      query: AdminAnalyticsModel.analyticsQuery,
      response: {
        200: AdminAnalyticsModel.analyticsResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Message analytics',
        operationId: 'getAnalyticsMessages',
        tags: ['Admin'],
      },
    },
  )
