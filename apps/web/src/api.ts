import { treaty } from "@elysiajs/eden";
import type { App } from "api";
import { env } from "./env";

export const api = treaty<App>(env.apiUrl, {
  fetch: { credentials: "include" },
});
