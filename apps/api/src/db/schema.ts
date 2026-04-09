import {
  pgTable,
  pgEnum,
  uuid,
  text,
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

export const accounts = pgTable("accounts", {
  accountId: uuid("account_id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.roleId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const userProfiles = pgTable("user_profiles", {
  userProfileId: uuid("user_profile_id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.accountId),
  name: text("name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  phoneNumber: text("phone_number"),
  fax: text("fax"),
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
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => userProfiles.userProfileId),
    rating: integer("rating").notNull(),
    reviewDescription: text("review_description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    check("rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export const posts = pgTable("posts", {
  postId: uuid("post_id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => userProfiles.userProfileId),
  postTitle: text("post_title").notNull(),
  description: text("description").notNull(),
  postType: postTypeEnum("post_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  rateType: rateTypeEnum("rate_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

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

export const postLocations = pgTable(
  "post_locations",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.postId),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.locationId),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [primaryKey({ columns: [table.postId, table.locationId] })],
);

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
  accounts: many(accounts),
  rolePermissions: many(rolePermissions),
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

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  role: one(roles, {
    fields: [accounts.roleId],
    references: [roles.roleId],
  }),
  userProfiles: many(userProfiles),
}));

export const userProfilesRelations = relations(
  userProfiles,
  ({ one, many }) => ({
    account: one(accounts, {
      fields: [userProfiles.accountId],
      references: [accounts.accountId],
    }),
    posts: many(posts),
    reviewsGiven: many(reviews, { relationName: "reviewer" }),
    reviewsReceived: many(reviews, { relationName: "reviewee" }),
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
  reviewee: one(userProfiles, {
    fields: [reviews.revieweeId],
    references: [userProfiles.userProfileId],
    relationName: "reviewee",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(userProfiles, {
    fields: [posts.authorId],
    references: [userProfiles.userProfileId],
  }),
  postCategories: many(postCategories),
  postLocations: many(postLocations),
  favourites: many(favourites),
  reports: many(reports),
  messageThreads: many(messageThreads),
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
  postLocations: many(postLocations),
}));

export const postLocationsRelations = relations(postLocations, ({ one }) => ({
  post: one(posts, {
    fields: [postLocations.postId],
    references: [posts.postId],
  }),
  location: one(locations, {
    fields: [postLocations.locationId],
    references: [locations.locationId],
  }),
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
