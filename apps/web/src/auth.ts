import { createAuthClient } from "better-auth/react";
import { impersonationClient } from "./impersonation-client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3001",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [impersonationClient()],
});
