import type { App } from 'api'
import type { treaty } from '@elysiajs/eden'

// Derive API types from the Elysia App type
export type Api = ReturnType<typeof treaty<App>>

// Users
export type UsersMeGet = Api['users']['me']['get']
export type UserResponse = NonNullable<Awaited<ReturnType<UsersMeGet>>['data']>
export type User = UserResponse
export type Role = User['role']
export type UserProfile = User['profiles'][number]
