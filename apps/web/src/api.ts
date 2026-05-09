import { treaty } from "@elysiajs/eden";
import type { App } from "api";

const apiServer =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");

export const api = treaty<App>(apiServer, {
  fetch: { credentials: "include" },
});
