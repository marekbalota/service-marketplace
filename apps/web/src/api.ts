import { treaty } from "@elysiajs/eden";
import type { App } from "api";

export const api = treaty<App>("localhost:3001");
