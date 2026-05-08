import { createAuthClient } from "better-auth/react";
import { impersonationClient } from "./impersonation-client";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [impersonationClient()],
});
