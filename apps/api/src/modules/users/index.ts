import { Elysia } from "elysia";
import { UsersModel } from "./model";
import { UsersService } from "./service";
import { authErrorResponses } from "../auth/model";
import { authRoutes } from "../auth";
import { ErrorMessages, errorResponse } from '../../lib/errors'

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(authRoutes)
  .get(
    "/me",
    async ({ user, set }) => {
      const currentUser = await UsersService.getCurrentUser(user.id);
      if (!currentUser) {
        set.status = 404
        return { message: ErrorMessages.userNotFound }
      }
      return currentUser;
    },
    {
      auth: true,
      response: {
        200: UsersModel.meResponse,
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'Get current user with permissions and profiles', operationId: 'getCurrentUser', tags: ['Users'] },
    }
  );
