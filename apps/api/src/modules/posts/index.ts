import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";
import { authRoutes } from "../auth";
import { Permissions } from "@marketplace/shared";
import { authErrorResponses, notFoundResponse } from "../auth/model";
import { errorResponse } from "../../lib/errors";

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
    async ({ params }) => await PostsService.findById(params.id),
    {
      params: PostsModel.findByIdParams,
      response: {
        200: PostsModel.findByIdResponse,
        ...notFoundResponse,
      },
      detail: { summary: "Get post by ID", operationId: "getPost", tags: ["Posts"] },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      const role = await PostsService.createWithPermissionCheck(user.id, body);
      set.status = 201;
      return role;
    },
    {
      authWithPermissions: Permissions.PostsCreate,
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
      await PostsService.updateWithPermissionCheck(user.id, permissions, params.id, body);
      set.status = 204;
    },
    {
      authWithPermissions: [Permissions.PostsEditOwn, Permissions.PostsEditAny],
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
    async ({ params, user, permissions, set }) => {
      await PostsService.deleteWithPermissionCheck(user.id, permissions, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: [Permissions.PostsDeleteOwn, Permissions.PostsDeleteAny],
      params: PostsModel.deleteParams,
      response: {
        204: t.Void(),
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: "Delete a post", operationId: "deletePost", tags: ["Posts"] },
    },
  );
