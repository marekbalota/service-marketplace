import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./modules/auth";
import { swagger } from "@elysiajs/swagger";
import { logger } from "./logger";
import { postsRoutes } from "./modules/posts";
import { categoriesRoutes } from "./modules/categories";
import { profilesRoutes } from "./modules/profiles";

export const app = new Elysia()
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
      ],
    },
  }))
  .use(logger)
  .get("/", () => "Marketplace API")
  .use(authRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(profilesRoutes)
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
