import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  primaryKey,
  check,
  unique,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Enums

export const postTypeEnum = pgEnum('post_type', ['REQUEST', 'OFFER'])
export const rateTypeEnum = pgEnum('rate_type', ['HOURLY', 'DAILY', 'FIXED'])
export const reportTargetTypeEnum = pgEnum('report_target_type', ['POST', 'MESSAGE', 'REVIEW'])
export const reportStatusEnum = pgEnum('report_status', ['pending', 'resolved', 'dismissed'])

// Tables

export const roles = pgTable('roles', {
  roleId: uuid('role_id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  priority: integer('priority').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
})

export const permissions = pgTable('permissions', {
  permissionId: uuid('permission_id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.roleId),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.permissionId),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
)

// BetterAuth tables

export const users = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
  roleId: uuid('role_id').references(() => roles.roleId),
  isBanned: boolean('is_banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpiration: timestamp('ban_expiration'),
})

export const sessions = pgTable('session', {
  id: uuid('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  impersonatedBy: uuid('impersonated_by').references(() => users.id),
})

export const oauthAccounts = pgTable('account', {
  id: uuid('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
})

export const verifications = pgTable('verification', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
})

export const userProfiles = pgTable('user_profiles', {
  userProfileId: uuid('user_profile_id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  bio: text('bio'),
  phoneNumber: text('phone_number'),
  fax: text('fax'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at'),
})

export const posts = pgTable('posts', {
  postId: uuid('post_id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  locationId: uuid('location_id').references(() => locations.locationId),
  postTitle: text('post_title').notNull(),
  description: text('description').notNull(),
  postType: postTypeEnum('post_type').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  rateType: rateTypeEnum('rate_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const reviews = pgTable(
  'reviews',
  {
    reviewId: uuid('review_id').primaryKey().defaultRandom(),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => userProfiles.userProfileId),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.postId),
    rating: integer('rating').notNull(),
    reviewDescription: text('review_description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [check('rating_check', sql`${table.rating} BETWEEN 1 AND 5`)],
)

export const categories = pgTable('categories', {
  categoryId: uuid('category_id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const postCategories = pgTable(
  'post_categories',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.postId),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.categoryId),
  },
  (table) => [primaryKey({ columns: [table.postId, table.categoryId] })],
)

export const locations = pgTable('locations', {
  locationId: uuid('location_id').primaryKey().defaultRandom(),
  country: text('country'),
  region: text('region'),
  city: text('city'),
  street: text('street'),
  houseNumber: text('house_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const images = pgTable('images', {
  imageId: uuid('image_id').primaryKey().defaultRandom(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  name: text('name').notNull(),
  link: text('link').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const favourites = pgTable(
  'favourites',
  {
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.userProfileId),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.postId),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userProfileId, table.postId] })],
)

export const profileLocations = pgTable(
  'profile_locations',
  {
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.userProfileId),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.locationId),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [primaryKey({ columns: [table.userProfileId, table.locationId] })],
)

export const messageThreads = pgTable(
  'message_threads',
  {
    threadId: uuid('thread_id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.postId),
    initiatorId: uuid('initiator_id')
      .notNull()
      .references(() => userProfiles.userProfileId),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [unique('message_threads_post_initiator_unique').on(table.postId, table.initiatorId)],
)

export const messages = pgTable('messages', {
  messageId: uuid('message_id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => messageThreads.threadId),
  content: text('content').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const reportCategories = pgTable(
  'report_categories',
  {
    categoryId: uuid('category_id').primaryKey().defaultRandom(),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    value: text('value').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [unique('report_categories_target_value_unique').on(table.targetType, table.value)],
)

export const reports = pgTable(
  'reports',
  {
    reportId: uuid('report_id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => userProfiles.userProfileId),
    postId: uuid('post_id').references(() => posts.postId),
    messageId: uuid('message_id').references(() => messages.messageId),
    reviewId: uuid('review_id').references(() => reviews.reviewId),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => reportCategories.categoryId),
    description: text('description'),
    status: reportStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    check(
      'reports_exactly_one_target',
      sql`(${table.postId} IS NOT NULL)::int + (${table.messageId} IS NOT NULL)::int + (${table.reviewId} IS NOT NULL)::int = 1`,
    ),
  ],
)

export const reviewImages = pgTable('review_images', {
  reviewImageId: uuid('review_image_id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.reviewId),
  name: text('name').notNull(),
  link: text('link').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

// Relations

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.roleId],
  }),
  userProfiles: many(userProfiles),
  sessions: many(sessions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.roleId],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.permissionId],
  }),
}))

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [userProfiles.accountId],
    references: [users.id],
  }),
  posts: many(posts),
  reviewsGiven: many(reviews, { relationName: 'reviewer' }),
  messagesSent: many(messages),
  initiatedThreads: many(messageThreads, { relationName: 'initiatedThreads' }),
  images: many(images),
  favourites: many(favourites),
  reports: many(reports),
  profileLocations: many(profileLocations),
}))

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  reviewer: one(userProfiles, {
    fields: [reviews.reviewerId],
    references: [userProfiles.userProfileId],
    relationName: 'reviewer',
  }),
  post: one(posts, {
    fields: [reviews.postId],
    references: [posts.postId],
  }),
  reviewImages: many(reviewImages),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(userProfiles, {
    fields: [posts.authorId],
    references: [userProfiles.userProfileId],
  }),
  location: one(locations, {
    fields: [posts.locationId],
    references: [locations.locationId],
  }),
  postCategories: many(postCategories),
  favourites: many(favourites),
  reports: many(reports),
  messageThreads: many(messageThreads),
  reviews: many(reviews),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}))

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, {
    fields: [postCategories.postId],
    references: [posts.postId],
  }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.categoryId],
  }),
}))

export const locationsRelations = relations(locations, ({ many }) => ({
  posts: many(posts),
  profileLocations: many(profileLocations),
}))

export const imagesRelations = relations(images, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [images.userProfileId],
    references: [userProfiles.userProfileId],
  }),
}))

export const favouritesRelations = relations(favourites, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [favourites.userProfileId],
    references: [userProfiles.userProfileId],
  }),
  post: one(posts, {
    fields: [favourites.postId],
    references: [posts.postId],
  }),
}))

export const profileLocationsRelations = relations(profileLocations, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [profileLocations.userProfileId],
    references: [userProfiles.userProfileId],
  }),
  location: one(locations, {
    fields: [profileLocations.locationId],
    references: [locations.locationId],
  }),
}))

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  post: one(posts, {
    fields: [messageThreads.postId],
    references: [posts.postId],
  }),
  initiator: one(userProfiles, {
    fields: [messageThreads.initiatorId],
    references: [userProfiles.userProfileId],
    relationName: 'initiatedThreads',
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(userProfiles, {
    fields: [messages.senderId],
    references: [userProfiles.userProfileId],
  }),
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.threadId],
  }),
}))

export const reportCategoriesRelations = relations(reportCategories, ({ many }) => ({
  reports: many(reports),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(userProfiles, {
    fields: [reports.reporterId],
    references: [userProfiles.userProfileId],
  }),
  post: one(posts, {
    fields: [reports.postId],
    references: [posts.postId],
  }),
  message: one(messages, {
    fields: [reports.messageId],
    references: [messages.messageId],
  }),
  review: one(reviews, {
    fields: [reports.reviewId],
    references: [reviews.reviewId],
  }),
  category: one(reportCategories, {
    fields: [reports.categoryId],
    references: [reportCategories.categoryId],
  }),
}))

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewImages.reviewId],
    references: [reviews.reviewId],
  }),
}))
