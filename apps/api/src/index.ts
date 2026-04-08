import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { postsRoutes } from "./routes/posts";
import { categoriesRoutes } from "./routes/categories";
import { userProfilesRoutes } from "./routes/user-profiles";

export const app = new Elysia()
  .use(cors({ origin: "http://localhost:3000" }))
  .get("/", () => "Marketplace API")
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(userProfilesRoutes)
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
