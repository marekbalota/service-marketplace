import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";
import { authRoutes } from "../auth";
import { Permissions } from "@marketplace/shared";
import { forbiddenResponse, notFoundResponse, unauthorizedResponse, errorResponse } from "../../lib/errors";
import { AuthModel } from "../auth/model";
import { ReviewsModel } from "../reviews/model";
import { ReviewsService } from "../reviews/service";
import { ReportsModel } from "../reports/model";
import { ReportsService } from "../reports/service";

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
  )
  .post(
    '/:id/reviews',
    async ({ params, body, user, set }) => {
      const review = await ReviewsService.createForAccount(user.id, params.id, body)
      set.status = 201
      return review
    },
    {
      auth: true,
      params: ReviewsModel.createParams,
      body: ReviewsModel.createBody,
      response: {
        201: ReviewsModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Create a review for a post', operationId: 'createReview', tags: ['Reviews'] },
    },
  )
  .post(
    '/:id/reports',
    async ({ params, body, user, set }) => {
      const report = await ReportsService.createForPostForAccount(user.id, params.id, body)
      set.status = 201
      return report
    },
    {
      auth: true,
      params: ReportsModel.createParams,
      body: ReportsModel.createBody,
      response: {
        201: ReportsModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Report a post', operationId: 'createReport', tags: ['Reports'] },
    },
  )
  .get(
    '/:id/reports/check',
    async ({ params, user }) => {
      const hasReported = await ReportsService.hasReportedPostForAccount(user.id, params.id)
      return { hasReported }
    },
    {
      auth: true,
      params: ReportsModel.checkParams,
      response: {
        200: ReportsModel.checkResponse,
        401: AuthModel.unauthorizedResponse,
      },
      detail: { summary: 'Check if current user has reported a post', operationId: 'checkReport', tags: ['Reports'] },
    },
  );
