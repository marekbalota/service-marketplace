import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";
import { authRoutes } from "../auth";
import { ProfilesService } from "../profiles/service";
import { ErrorMessages, errorResponse, AuthErrorMessages } from "../../lib/errors";
import { Permissions } from "../../lib/rbac/permissions";
import { authErrorResponses } from "../auth/model";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .use(authRoutes)
  .get(
    "/",
    async ({ query }) => await PostsService.findAll(query),
    {
      query: PostsModel.findAllQuery,
      response: { 200: PostsModel.findAllResponse },
      detail: { summary: "List posts", operationId: "listPosts", tags: ["Posts"] },
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
      detail: { summary: "Get post by ID", operationId: "getPost", tags: ["Posts"] },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      const owned = await ProfilesService.isProfileOwnedByAccount(body.authorId, user.id);
      if (!owned) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      set.status = 201;
      return PostsService.create(body);
    },
    {
      auth: true,
      body: PostsModel.createBody,
      response: {
        201: PostsModel.createResponse,
        ...authErrorResponses,
      },
      detail: { summary: "Create a post", operationId: "createPost", tags: ["Posts"] },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, permissions, set }) => {
      const post = await PostsService.findById(params.id);
      if (!post) {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }

      const canEditAny = permissions.includes(Permissions.PostsEditAny);
      const canEditOwn = permissions.includes(Permissions.PostsEditOwn);
      const profileIds = await ProfilesService.getProfileIdsByAccount(user.id);
      const isOwner = profileIds.includes(post.authorId);

      if (!canEditAny && !(canEditOwn && isOwner)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
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
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: "Update a post", operationId: "updatePost", tags: ["Posts"] },
    },
  )
  .delete(
    "/:id",
    async ({ params, user , permissions, set }) => {
      const post = await PostsService.findById(params.id);
      if (!post) {
        set.status = 404;
        return { message: ErrorMessages.postNotFound };
      }

      // Permission check: delete any OR (delete own AND is owner)
      const canDeleteAny = permissions.includes(Permissions.PostsDeleteAny);
      const canDeleteOwn = permissions.includes(Permissions.PostsDeleteOwn);
      const profileIds = await ProfilesService.getProfileIdsByAccount(user.id);
      const isOwner = profileIds.includes(post.authorId);

      if (!canDeleteAny && !(canDeleteOwn && isOwner)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
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
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: "Delete a post", operationId: "deletePost", tags: ["Posts"] },
    },
  );
