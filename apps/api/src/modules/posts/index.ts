import { Elysia, t } from "elysia";
import { PostsModel } from "./model";
import { PostsService } from "./service";

const notFound = t.Object({ message: t.String() });

export const postsRoutes = new Elysia({ prefix: "/posts" })
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
        return { message: "Post not found" };
      }
      return post;
    },
    {
      params: PostsModel.findByIdParams,
      response: {
        200: PostsModel.findByIdResponse,
        404: notFound,
      },
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201;
      return await PostsService.create(body);
    },
    {
      body: PostsModel.createBody,
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const updated = await PostsService.update(params.id, body);
      if (!updated) {
        set.status = 404;
        return { message: "Post not found" };
      }
      return updated;
    },
    {
      params: PostsModel.updateParams,
      body: PostsModel.updateBody,
      response: { 404: notFound },
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const result = await PostsService.delete(params.id);
      if (!result) {
        set.status = 404;
        return { message: "Post not found" };
      }
      return { message: "Post deleted" };
    },
    {
      params: PostsModel.deleteParams,
      response: {
        200: t.Object({ message: t.String() }),
        404: notFound,
      },
    },
  );
