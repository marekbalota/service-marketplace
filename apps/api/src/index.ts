import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { logger } from "./logger";
import { postsRoutes } from "./modules/posts";
import { categoriesRoutes } from "./modules/categories";
import { profilesRoutes } from "./modules/profiles";

export const app = new Elysia()
  .use(cors({ origin: "http://localhost:3000" }))
  .use(logger)
  .get("/", () => "Marketplace API")
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
