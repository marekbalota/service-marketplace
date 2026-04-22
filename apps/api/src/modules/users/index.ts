import { Elysia } from "elysia";
import { UsersModel } from "./model";
import { UsersService } from "./service";
import { authRoutes } from "../auth";
import { notFoundResponse, unauthorizedResponse } from '../../lib/errors'

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(authRoutes)
  .get(
    "/me",
    async ({ user }) => {
      return await UsersService.getCurrentUser(user.id);
    },
    {
      auth: true,
      response: {
        200: UsersModel.meResponse,
        ...unauthorizedResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Get current user with permissions and profiles', operationId: 'getCurrentUser', tags: ['Users'] },
    }
  );
