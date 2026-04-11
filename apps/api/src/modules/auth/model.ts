import { t } from "elysia";

export const AuthModel = {
  unauthorizedResponse: t.Object({ message: t.String() }),
  forbiddenResponse:    t.Object({ message: t.String() }),
  messages: {
    unauthorized: 'Unauthorized',
    forbidden:    'Forbidden',
  },
} as const;
