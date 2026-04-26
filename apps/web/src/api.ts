import { treaty } from "@elysiajs/eden";
import type { App } from "api";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = treaty<App>(apiUrl, {
  fetch: { credentials: "include" },
});
