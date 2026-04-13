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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums

export const postTypeEnum = pgEnum("post_type", ["REQUEST", "OFFER"]);
export const rateTypeEnum = pgEnum("rate_type", ["HOURLY", "DAILY", "FIXED"]);

// Tables

export const roles = pgTable("roles", {
  roleId: uuid("role_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const permissions = pgTable("permissions", {
  permissionId: uuid("permission_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.permissionId),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

// BetterAuth tables

export const users = pgTable("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
  roleId: uuid("role_id").references(() => roles.roleId),
});

export const sessions = pgTable("session", {
  id: uuid("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const oauthAccounts = pgTable("account", {
  id: uuid("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

export const verifications = pgTable("verification", {
  id: uuid("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const userProfiles = pgTable("user_profiles", {
  userProfileId: uuid("user_profile_id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  phoneNumber: text("phone_number"),
  fax: text("fax"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const posts = pgTable("posts", {
  postId: uuid("post_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => userProfiles.userProfileId),
  locationId: uuid("location_id").references(() => locations.locationId),
  postTitle: text("post_title").notNull(),
  description: text("description").notNull(),
  postType: postTypeEnum("post_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  rateType: rateTypeEnum("rate_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const reviews = pgTable(
  "reviews",
  {
    reviewId: uuid("review_id").primaryKey().defaultRandom(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => userProfiles.userProfileId),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.postId),
    rating: integer("rating").notNull(),
    reviewDescription: text("review_description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    check("rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export const categories = pgTable("categories", {
  categoryId: uuid("category_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const postCategories = pgTable(
  "post_categories",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.postId),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.categoryId),
  },
  (table) => [primaryKey({ columns: [table.postId, table.categoryId] })],
);

export const locations = pgTable("locations", {
  locationId: uuid("location_id").primaryKey().defaultRandom(),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  street: text("street"),
  houseNumber: text("house_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const images = pgTable("images", {
  imageId: uuid("image_id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id")
    .notNull()
    .references(() => userProfiles.userProfileId),
  name: text("name").notNull(),
  link: text("link").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const favourites = pgTable(
  "favourites",
  {
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.userProfileId),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.postId),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [primaryKey({ columns: [table.userProfileId, table.postId] })],
);

export const messageThreads = pgTable("message_threads", {
  threadId: uuid("thread_id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.postId),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const messages = pgTable("messages", {
  messageId: uuid("message_id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => userProfiles.userProfileId),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => messageThreads.threadId),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const reports = pgTable("reports", {
  reportId: uuid("report_id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => userProfiles.userProfileId),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.postId),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Relations

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.roleId],
  }),
  userProfiles: many(userProfiles),
  sessions: many(sessions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.roleId],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.permissionId],
    }),
  }),
);

export const userProfilesRelations = relations(
  userProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userProfiles.accountId],
      references: [users.id],
    }),
    posts: many(posts),
    reviewsGiven: many(reviews, { relationName: "reviewer" }),
    messagesSent: many(messages),
    images: many(images),
    favourites: many(favourites),
    reports: many(reports),
  }),
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(userProfiles, {
    fields: [reviews.reviewerId],
    references: [userProfiles.userProfileId],
    relationName: "reviewer",
  }),
  post: one(posts, {
    fields: [reviews.postId],
    references: [posts.postId],
  }),
}));

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
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}));

export const postCategoriesRelations = relations(
  postCategories,
  ({ one }) => ({
    post: one(posts, {
      fields: [postCategories.postId],
      references: [posts.postId],
    }),
    category: one(categories, {
      fields: [postCategories.categoryId],
      references: [categories.categoryId],
    }),
  }),
);

export const locationsRelations = relations(locations, ({ many }) => ({
  posts: many(posts),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [images.userProfileId],
    references: [userProfiles.userProfileId],
  }),
}));

export const favouritesRelations = relations(favourites, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [favourites.userProfileId],
    references: [userProfiles.userProfileId],
  }),
  post: one(posts, {
    fields: [favourites.postId],
    references: [posts.postId],
  }),
}));

export const messageThreadsRelations = relations(
  messageThreads,
  ({ one, many }) => ({
    post: one(posts, {
      fields: [messageThreads.postId],
      references: [posts.postId],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(userProfiles, {
    fields: [messages.senderId],
    references: [userProfiles.userProfileId],
  }),
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.threadId],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(userProfiles, {
    fields: [reports.reporterId],
    references: [userProfiles.userProfileId],
  }),
  post: one(posts, {
    fields: [reports.postId],
    references: [posts.postId],
  }),
}));
