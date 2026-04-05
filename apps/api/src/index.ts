import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

export const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello Elysia")
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
