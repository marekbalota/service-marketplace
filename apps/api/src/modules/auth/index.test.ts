import { describe, it, expect } from "bun:test";
import { auth, verificationTokenStore } from "./service";
import { db } from "../../db";

const TEST_EMAIL = `auth-test-${Date.now()}@example.com`;
const TEST_NAME = "Auth Test User";
const TEST_PASSWORD = "password123";

function getLatestVerificationToken(email: string): string {
  const token = verificationTokenStore.get(email);
  if (!token) {
    throw new Error(`No verification token found for ${email}`);
  }
  return token;
}

describe("POST /api/auth/sign-up/email", () => {
  it("returns 200 and creates a user row", async () => {
    const res = await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { email: string } };
    expect(body.user.email).toBe(TEST_EMAIL);
  });

  it("auto-creates a userProfile linked to the new user", async () => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    });
    expect(user).toBeTruthy();

    const profile = await db.query.userProfiles.findFirst({
      where: (p, { eq }) => eq(p.accountId, user!.id),
    });
    expect(profile).toBeTruthy();
    expect(profile!.email).toBe(TEST_EMAIL);
  });

  it("returns 200 (not 422) for duplicate email when requireEmailVerification is on", async () => {
    // better-auth returns a generic 200 for duplicate emails to prevent email enumeration
    const res = await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(res.status).toBe(200);
  });

  it("creates user with emailVerified false", async () => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    });
    expect(user?.emailVerified).toBe(false);
  });
});

describe("Email verification", () => {
  it("sign-in before verification returns 403", async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(res.status).toBe(403);
  });

  it("verifying email marks the user as verified in DB", async () => {
    const token = await getLatestVerificationToken(TEST_EMAIL);
    const res = await auth.api.verifyEmail({
      query: { token, callbackURL: "http://localhost:3000/verify-email/callback" },
      asResponse: true,
    });
    expect(res.status).toBeLessThan(400);

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    });
    expect(user?.emailVerified).toBe(true);
  });
});

describe("POST /api/auth/sign-in/email", () => {
  it("returns 200 and sets a session cookie", async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain("better-auth.session_token");
  });

  it("returns 401 for wrong password", async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: "wrong-password" },
      asResponse: true,
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/sign-out", () => {
  it("returns 200", async () => {
    const signInRes = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    const cookie = signInRes.headers.get("set-cookie") ?? "";

    const res = await auth.api.signOut({
      headers: new Headers({ Cookie: cookie }),
      asResponse: true,
    });
    expect(res.status).toBe(200);
  });
});
