// Export admin model types for frontend consumption
export type { AdminRolesModel } from './modules/admin/roles/model';
export type { AdminUsersModel } from './modules/admin/users/model';

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { authRoutes } from "./modules/auth";
import { logger } from "./lib/logger";
import { postsRoutes } from "./modules/posts";
import { categoriesRoutes } from "./modules/categories";
import { profilesRoutes } from "./modules/profiles";
import { usersRoutes } from "./modules/users";
import { adminRolesRoutes } from "./modules/admin/roles";
import { adminUsersRoutes } from "./modules/admin/users";
import { ForbiddenError, NotFoundError } from "./lib/errors";

export const app = new Elysia()
  .error({ ForbiddenError, NotFoundError })
  .onError(({ code, error, status }) => {
    if (code === 'ForbiddenError') {
      return status(403, { message: error.message });
    }
    if (code === 'NotFoundError') {
      return status(404, { message: error.message });
    }
  })
  .use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }))
  .use(swagger({
    documentation: {
      info: {
        title: "Marketplace for Services API",
        version: "1.0.0",
        description: "REST API for a service marketplace where users post offers or requests for services, organised by category with reviews.",
      },
      servers: [
        { url: "http://localhost:3001", description: "Local development" },
      ],
      tags: [
        { name: "Posts",      description: "Service post listings (offers and requests)" },
        { name: "Profiles",   description: "User profiles" },
        { name: "Categories", description: "Post categories" },
        { name: "Admin",      description: "Admin operations" },
      ],
    },
  }))
  .use(logger)
  .get("/", () => "Marketplace API")
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(profilesRoutes)
  .use(adminRolesRoutes)
  .use(adminUsersRoutes)
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
