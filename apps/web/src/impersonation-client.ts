import type { BetterAuthClientPlugin } from "better-auth";
import type { BetterFetch } from "better-auth/client";

export function impersonationClient() {
  return {
    id: "impersonation",
    getActions: ($fetch: BetterFetch) => ({
      admin: {
        impersonateUser: (data: { userId: string }) =>
          $fetch("/admin/impersonate-user", { method: "POST", body: data }),
        stopImpersonating: () =>
          $fetch("/admin/stop-impersonating", { method: "POST" }),
      },
    }),
  } satisfies BetterAuthClientPlugin;
}
