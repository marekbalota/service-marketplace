import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";
import { authRoutes } from "../auth";
import { Permissions } from "@marketplace/shared";
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from "../../lib/errors";

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
      const post = await PostsService.createWithPermissionCheck(user.id, body);
      set.status = 201;
      return post;
    },
    {
      authWithPermissions: Permissions.PostsCreate,
      body: PostsModel.createBody,
      response: {
        201: PostsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: "Create a post", operationId: "createPost", tags: ["Posts"] },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, set }) => {
      const updated = await PostsService.updateWithPermissionCheck(user.id, params.id, body);
      set.status = 200;
      return updated;
    },
    {
      authWithPermissions: Permissions.PostsEditOwn,
      params: PostsModel.updateParams,
      body: PostsModel.updateBody,
      response: {
        200: PostsModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: "Update a post", operationId: "updatePost", tags: ["Posts"] },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, set }) => {
      await PostsService.deleteWithPermissionCheck(user.id, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.PostsDeleteOwn,
      params: PostsModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: "Delete a post", operationId: "deletePost", tags: ["Posts"] },
    },
  );
