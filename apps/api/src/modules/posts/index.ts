import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";
import { AuthModel } from "../auth/model";
import { authRoutes } from "../auth";
import { ProfilesService } from "../profiles/service";
import { ErrorMessages, errorResponse } from "../../errors";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .use(authRoutes)
  .get(
    "/",
    async ({ query }) => await PostsService.findAll(query),
    {
      query: PostsModel.findAllQuery,
      response: { 200: PostsModel.findAllResponse },
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const post = await PostsService.findById(params.id);
      if (!post) {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }
      return post;
    },
    {
      params: PostsModel.findByIdParams,
      response: {
        200: PostsModel.findByIdResponse,
        404: errorResponse,
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      const owned = await ProfilesService.isProfileOwnedByAccount(body.authorId, user.id);
      if (!owned) {
        set.status = 403;
        return { message: AuthModel.messages.forbidden };
      }

      set.status = 201;
      return PostsService.create(body);
    },
    {
      auth: true,
      body: PostsModel.createBody,
      response: {
        201: PostsModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, set }) => {
      const check = await PostsService.checkPostOwnership(params.id, user.id);
      if (check === 'not_found') {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }
      if (check === 'forbidden') {
        set.status = 403;
        return { message: AuthModel.messages.forbidden };
      }

      const updated = await PostsService.update(params.id, body);
      if (!updated) {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: PostsModel.updateParams,
      body: PostsModel.updateBody,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, set }) => {
      const check = await PostsService.checkPostOwnership(params.id, user.id);
      if (check === 'not_found') {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }
      if (check === 'forbidden') {
        set.status = 403;
        return { message: AuthModel.messages.forbidden };
      }

      const deleted = await PostsService.delete(params.id);
      if (!deleted) {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: PostsModel.deleteParams,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
      },
    },
  );
