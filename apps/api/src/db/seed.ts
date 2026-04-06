import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function upsertRole(name: string, description: string) {
  const existing = await db.query.roles.findFirst({
    where: (r, { eq }) => eq(r.name, name),
  });
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(schema.roles)
    .values({ name, description })
    .returning();
  return created!;
}

async function upsertAccount(
  roleId: string,
  name: string,
  email: string,
) {
  const existing = await db.query.accounts.findFirst({
    where: (a, { eq }) => eq(a.email, email),
  });
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(schema.accounts)
    .values({ roleId, name, email, passwordHash: "$2b$10$placeholder_hash" })
    .returning();
  return created!;
}

async function upsertProfile(
  accountId: string,
  name: string,
  email: string,
  bio: string,
) {
  const existing = await db.query.userProfiles.findFirst({
    where: (p, { eq }) => eq(p.accountId, accountId),
  });
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(schema.userProfiles)
    .values({ accountId, name, email, bio })
    .returning();
  return created!;
}

async function upsertCategory(name: string, description: string) {
  const existing = await db.query.categories.findFirst({
    where: (c, { eq }) => eq(c.name, name),
  });
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(schema.categories)
    .values({ name, description })
    .returning();
  return created!;
}

async function seed() {
  console.log("🌱 Seeding database...");

  const userRole = await upsertRole("user", "Regular user");
  await upsertRole("admin", "Administrator");

  const alice = await upsertAccount(userRole.roleId, "Alice Johnson", "alice@example.com");
  const bob = await upsertAccount(userRole.roleId, "Bob Smith", "bob@example.com");
  const carol = await upsertAccount(userRole.roleId, "Carol White", "carol@example.com");
  const david = await upsertAccount(userRole.roleId, "David Brown", "david@example.com");

  const aliceProfile = await upsertProfile(alice.accountId, alice.name, alice.email, "Experienced math tutor with 5 years of teaching.");
  const bobProfile = await upsertProfile(bob.accountId, bob.name, bob.email, "Licensed plumber available for residential jobs.");
  const carolProfile = await upsertProfile(carol.accountId, carol.name, carol.email, "Freelance graphic designer and illustrator.");
  const davidProfile = await upsertProfile(david.accountId, david.name, david.email, "Handyman — no job too small.");

  const tutoring = await upsertCategory("Tutoring", "Academic tutoring and coaching");
  const plumbing = await upsertCategory("Plumbing", "Plumbing installation and repairs");
  const design = await upsertCategory("Design", "Graphic, web, and UX design");
  const homeRepair = await upsertCategory("Home Repair", "General home maintenance and repairs");
  const cleaning = await upsertCategory("Cleaning", "Home and office cleaning services");
  const techSupport = await upsertCategory("Tech Support", "IT help and computer repairs");

  const postsData: {
    authorId: string;
    postTitle: string;
    description: string;
    postType: "OFFER" | "REQUEST";
    price: string | null;
    rateType: "HOURLY" | "DAILY" | "FIXED" | null;
    categories: (typeof tutoring)[];
  }[] = [
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Math & Physics Tutoring — High School & University",
      description:
        "I offer private tutoring sessions in mathematics and physics for high school and university students. I cover calculus, linear algebra, mechanics, and more. Sessions are available online or in-person in Brno.",
      postType: "OFFER",
      price: "25.00",
      rateType: "HOURLY",
      categories: [tutoring],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Plumbing Repairs & Installations",
      description:
        "Professional plumber available for leak repairs, pipe installations, bathroom fitting, and boiler servicing. Available on weekdays and weekends. Fast response and fair pricing.",
      postType: "OFFER",
      price: "60.00",
      rateType: "HOURLY",
      categories: [plumbing, homeRepair],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Logo & Brand Identity Design",
      description:
        "I design logos, brand guidelines, and visual identities for startups and small businesses. Includes multiple concepts, revisions, and final files in all formats. Contact me with your brief.",
      postType: "OFFER",
      price: "350.00",
      rateType: "FIXED",
      categories: [design],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "General Handyman Services",
      description:
        "Need something fixed around the house? I handle furniture assembly, painting, shelving, door repairs, and small plumbing jobs. No job too small. Based in Prague, can travel.",
      postType: "OFFER",
      price: "40.00",
      rateType: "HOURLY",
      categories: [homeRepair],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Looking for Czech Language Tutor",
      description:
        "I'm an English speaker relocating to Prague and looking for a patient Czech tutor for conversational lessons. Prefer online sessions, 2x per week. Happy to do language exchange if you want to practise English.",
      postType: "REQUEST",
      price: null,
      rateType: null,
      categories: [tutoring],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Seeking Website Designer for Small Business",
      description:
        "I run a small plumbing business and need a clean, professional website — 4-5 pages, contact form, and mobile-friendly. Looking for a freelancer who can deliver within 3 weeks. Budget is flexible.",
      postType: "REQUEST",
      price: "500.00",
      rateType: "FIXED",
      categories: [design, techSupport],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "UI/UX Design for Mobile App",
      description:
        "Offering full UI/UX design for mobile apps — wireframes, high-fidelity mockups, and a design system in Figma. I specialise in clean, user-centred interfaces. Available for long-term collaboration.",
      postType: "OFFER",
      price: "85.00",
      rateType: "HOURLY",
      categories: [design],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Office Deep Cleaning — One-off or Regular",
      description:
        "Professional cleaning for offices and commercial spaces. We handle everything: floors, windows, kitchens, and bathrooms. One-off or regular contracts available. Insured and fully equipped.",
      postType: "OFFER",
      price: "200.00",
      rateType: "FIXED",
      categories: [cleaning],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Computer Repair & Tech Help Needed",
      description:
        "My laptop won't boot after a Windows update. I need someone who can come to my home in Brno and diagnose / fix it. I have all the original discs and product keys. Willing to pay a fair rate.",
      postType: "REQUEST",
      price: null,
      rateType: null,
      categories: [techSupport],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Bathroom Renovation — Full Project",
      description:
        "Complete bathroom renovation service: tiling, plumbing, lighting, and fittings. I manage the whole project from start to finish. Free quote provided after site visit. References available on request.",
      postType: "OFFER",
      price: "3500.00",
      rateType: "FIXED",
      categories: [plumbing, homeRepair],
    },
  ];

  for (const post of postsData) {
    const { categories: postCategories, ...postValues } = post;
    const [inserted] = await db
      .insert(schema.posts)
      .values(postValues)
      .returning();

    for (const cat of postCategories) {
      await db
        .insert(schema.postCategories)
        .values({ postId: inserted!.postId, categoryId: cat.categoryId })
        .onConflictDoNothing();
    }
  }

  console.log("✅ Seeded:");
  console.log("   2 roles");
  console.log("   4 accounts + profiles");
  console.log("   6 categories");
  console.log(`   ${postsData.length} posts`);

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
