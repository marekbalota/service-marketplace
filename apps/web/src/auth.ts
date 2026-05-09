import { createAuthClient } from "better-auth/react";
import { impersonationClient } from "./impersonation-client";

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"),
  fetchOptions: {
    credentials: "include",
  },
  plugins: [impersonationClient()],
});
