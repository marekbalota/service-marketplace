import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { treaty } from "@elysiajs/eden";
import { postsRoutes } from ".";
import { profilesRoutes } from "../profiles";
import { usersRoutes } from "../users";
import { authRoutes } from "../auth";

const app = new Elysia().use(authRoutes).use(usersRoutes).use(postsRoutes).use(profilesRoutes);
const client = treaty(app);

/** Extract postId from an Eden create-post response whose union type is hard to narrow. */
function getPostId(data: unknown): string {
  return (data as { postId: string }).postId
}

let sessionCookie = "";
let authorId = "";

beforeAll(async () => {
  const signInRes = await app.handle(
    new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com", password: "password123" }),
    }),
  );
  sessionCookie = signInRes.headers.get("set-cookie") ?? "";

  // Get profile ID from /users/me which includes profiles
  const meRes = await app.handle(new Request("http://localhost/users/me", {
    headers: { Cookie: sessionCookie },
  }));
  const meData = await meRes.json() as { profiles: { userProfileId: string }[] };
  authorId = meData.profiles[0]?.userProfileId ?? "";
});

describe("GET /posts", () => {
  it("returns 200 with items, total, and totalPages", async () => {
    const { data, error } = await client.posts.get();
    expect(error).toBeNull();
    expect(Array.isArray(data!.items)).toBe(true);
    expect(typeof data!.total).toBe("number");
    expect(typeof data!.totalPages).toBe("number");
  });

  it("each item has required fields", async () => {
    const { data } = await client.posts.get({ query: { size: 5 } });
    for (const item of data!.items) {
      expect(typeof item.postId).toBe("string");
      expect(typeof item.postTitle).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(["OFFER", "REQUEST"]).toContain(item.postType);
      expect(typeof item.authorName).toBe("string");
      expect(Array.isArray(item.categories)).toBe(true);
    }
  });

  it("size param limits number of returned items", async () => {
    const { data } = await client.posts.get({ query: { size: 3 } });
    expect(data!.items.length).toBeLessThanOrEqual(3);
  });

  it("filters by type=OFFER — all items are OFFER", async () => {
    const { data } = await client.posts.get({ query: { type: "OFFER" } });
    for (const item of data!.items) {
      expect(item.postType).toBe("OFFER");
    }
  });

  it("filters by type=REQUEST — all items are REQUEST", async () => {
    const { data } = await client.posts.get({ query: { type: "REQUEST" } });
    for (const item of data!.items) {
      expect(item.postType).toBe("REQUEST");
    }
  });

  it("returns 422 for an invalid type value", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client.posts.get({ query: { type: "INVALID" as any } });
    expect(error?.status).toBe(422);
  });

  it("offset paginates correctly", async () => {
    const { data: page1 } = await client.posts.get({ query: { size: 2, offset: 0 } });
    const { data: page2 } = await client.posts.get({ query: { size: 2, offset: 2 } });

    if (page1!.total > 2) {
      const ids1 = page1!.items.map((p) => p.postId);
      const ids2 = page2!.items.map((p) => p.postId);
      expect(ids1).not.toEqual(ids2);
    }
  });

  it("totalPages is ceil(total / size)", async () => {
    const { data } = await client.posts.get({ query: { size: 5 } });
    const expected = Math.ceil(data!.total / 5);
    expect(data!.totalPages).toBe(expected);
  });

  it("search filters by title or description", async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } });
    if (!all || all.items.length === 0) return;

    const firstWord = all.items[0]!.postTitle.split(" ")[0]!;
    const { data, error } = await client.posts.get({ query: { search: firstWord } });
    expect(error).toBeNull();
    expect(data!.items.length).toBeGreaterThan(0);
  });
});

describe("GET /posts/:id", () => {
  it("returns 404 for unknown id", async () => {
    const { error } = await client.posts({ id: "00000000-0000-0000-0000-000000000000" }).get();
    expect(error?.status).toBe(404);
  });

  it("returns a post with all fields for a known id", async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } });
    if (!all || all.items.length === 0) return;

    const { data, error } = await client.posts({ id: all.items[0]!.postId }).get();
    expect(error).toBeNull();
    expect(data!.postId).toBe(all.items[0]!.postId);
    expect(typeof data!.authorName).toBe("string");
    expect(Array.isArray(data!.categories)).toBe(true);
  });

  it("response includes location, reviews, reviewCount, and averageRating", async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } });
    if (!all || all.items.length === 0) return;

    const { data } = await client.posts({ id: all.items[0]!.postId }).get();
    expect(data!.location === null || typeof data!.location === "object").toBe(true);
    expect(Array.isArray(data!.reviews)).toBe(true);
    expect(typeof data!.reviewCount).toBe("number");
    expect(data!.averageRating === null || typeof data!.averageRating === "number").toBe(true);
  });

  it("each review has reviewerName as string, and averageRating is between 1-5 when reviews exist", async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } });
    if (!all || all.items.length === 0) return;

    const { data } = await client.posts({ id: all.items[0]!.postId }).get();

    if (data!.reviewCount > 0) {
      for (const review of data!.reviews) {
        expect(typeof review.reviewerName).toBe("string");
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      }
      expect(data!.averageRating).not.toBeNull();
      expect(data!.averageRating!).toBeGreaterThanOrEqual(1);
      expect(data!.averageRating!).toBeLessThanOrEqual(5);
    }
  });
});

describe("POST /posts", () => {
  it("returns 401 without a session", async () => {
    const { error } = await client.posts.post({
      authorId,
      postTitle: "Test post title",
      description: "Test description with enough length",
      postType: "OFFER",
    });
    expect(error?.status).toBe(401);
  });

  it("creates a post and returns 201", async () => {
    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: "Test post title",
        description: "Test description with enough length",
        postType: "OFFER",
      },
      { headers: { Cookie: sessionCookie } },
    );
    expect(error).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = data as any;
    expect(typeof post?.postId).toBe("string");
    expect(post?.postTitle).toBe("Test post title");
  });

  it("returns 422 when postTitle is too short", async () => {
    const { error } = await client.posts.post(
      {
        authorId,
        postTitle: "Hi",
        description: "Description with enough length",
        postType: "OFFER",
      },
      { headers: { Cookie: sessionCookie } },
    );
    expect(error?.status).toBe(422);
  });

  it("creates a post with a new location object", async () => {
    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: "Post with new location",
        description: "Test description with enough length",
        postType: "REQUEST",
        location: {
          country: "CZ",
          region: "South Moravian Region",
          city: "Brno",
          street: "Botanická",
          houseNumber: "68a",
        },
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(typeof getPostId(data)).toBe("string")
  })

  it("creates a post with an existing locationId", async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: "Seed post for location reuse",
        description: "Test description with enough length",
        postType: "OFFER",
        location: { country: "CZ", region: "South Moravian", city: "Brno" },
      },
      { headers: { Cookie: sessionCookie } },
    )
    const seedPostId = getPostId(created)
    const { data: fetchedPost } = await client.posts({ id: seedPostId }).get()
    const existingLocationId = fetchedPost?.location?.locationId
    expect(existingLocationId).toBeDefined()

    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: "Post reusing location",
        description: "Test description with enough length",
        postType: "OFFER",
        locationId: existingLocationId,
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(typeof getPostId(data)).toBe("string")
  })

  it("returns 403 when authorId does not belong to session user", async () => {
    const { error } = await client.posts.post(
      {
        authorId: "00000000-0000-0000-0000-000000000000",
        postTitle: "Test post title",
        description: "Test description with enough length",
        postType: "OFFER",
      },
      { headers: { Cookie: sessionCookie } },
    );
    expect(error?.status).toBe(403);
  });
});

describe("PATCH /posts/:id", () => {
  it("returns 401 without a session", async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } });
    if (!all || all.items.length === 0) return;

    const { error } = await client.posts({ id: all.items[0]!.postId }).patch({
      postTitle: "Updated title",
    });
    expect(error?.status).toBe(401);
  });

  it("returns 404 for unknown id with session", async () => {
    const { error } = await client.posts({ id: "00000000-0000-0000-0000-000000000000" }).patch(
      { postTitle: "Updated title" },
      { headers: { Cookie: sessionCookie } },
    );
    expect(error?.status).toBe(404);
  });
});

describe("DELETE /posts/:id", () => {
  it("returns 401 without a session", async () => {
    const { error } = await client.posts({ id: "00000000-0000-0000-0000-000000000000" }).delete();
    expect(error?.status).toBe(401);
  });

  it("soft-deletes own post and returns 204", async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: "Post to be deleted",
        description: "This post will be soft-deleted in test",
        postType: "REQUEST",
      },
      { headers: { Cookie: sessionCookie } },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postId = (created as any)?.postId as string;

    const { error } = await client.posts({ id: postId }).delete(undefined, {
      headers: { Cookie: sessionCookie },
    });
    expect(error).toBeNull();

    const { error: getError } = await client.posts({ id: postId }).get();
    expect(getError?.status).toBe(404);
  });
});
