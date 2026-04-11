import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { auth } from "../modules/auth/service";

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

async function upsertUser(name: string, email: string) {
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });
  if (existing) {
    const profile = await db.query.userProfiles.findFirst({
      where: (p, { eq }) => eq(p.accountId, existing.id),
    });
    return { user: existing, profile: profile! };
  }

  const result = await auth.api.signUpEmail({
    body: { name, email, password: "password123" },
    headers: new Headers(),
  });

  const profile = await db.query.userProfiles.findFirst({
    where: (p, { eq }) => eq(p.accountId, result.user.id),
  });
  return { user: result.user, profile: profile! };
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

  await upsertRole("user", "Regular user");
  await upsertRole("admin", "Administrator");

  const { profile: aliceProfile } = await upsertUser("Alice Johnson", "alice@example.com");
  const { profile: bobProfile }   = await upsertUser("Bob Smith",     "bob@example.com");
  const { profile: carolProfile } = await upsertUser("Carol White",   "carol@example.com");
  const { profile: davidProfile } = await upsertUser("David Brown",   "david@example.com");
  const { profile: elenaProfile } = await upsertUser("Elena Novak",   "elena@example.com");
  const { profile: frankProfile } = await upsertUser("Frank Müller",  "frank@example.com");

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
    location?: { country?: string; region?: string; city?: string; street?: string; houseNumber?: string };
  }[] = [
    // ── Tutoring ──
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Math & Physics Tutoring — High School & University",
      description: "I offer private tutoring sessions in mathematics and physics for high school and university students. I cover calculus, linear algebra, mechanics, and more. Sessions available online or in-person in Brno.",
      postType: "OFFER", price: "25.00", rateType: "HOURLY", categories: [tutoring],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Looking for Czech Language Tutor",
      description: "I'm an English speaker relocating to Prague and looking for a patient Czech tutor for conversational lessons. Prefer online sessions, 2x per week. Happy to do language exchange.",
      postType: "REQUEST", price: null, rateType: null, categories: [tutoring],
      location: { country: "Czech Republic", region: "Prague", city: "Prague" },
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Python & Data Science Tutoring",
      description: "I teach Python programming from basics to data science — pandas, NumPy, Matplotlib, and machine learning fundamentals. Suitable for students and career changers. Online sessions via Zoom.",
      postType: "OFFER", price: "35.00", rateType: "HOURLY", categories: [tutoring, techSupport],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Need English Conversation Practice Partner",
      description: "Looking for a native or fluent English speaker for weekly conversation practice. I'm a B2 level learner aiming for C1. Happy to meet in a café or do video calls. Can offer German in exchange.",
      postType: "REQUEST", price: null, rateType: null, categories: [tutoring],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Music Theory & Piano Lessons for Beginners",
      description: "Patient and encouraging piano teacher offering lessons for absolute beginners through to grade 5. I come to your home or teach at my studio in Brno. All ages welcome.",
      postType: "OFFER", price: "30.00", rateType: "HOURLY", categories: [tutoring],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Maths Tutor Needed for 13-Year-Old",
      description: "My daughter is struggling with algebra and geometry at school. Looking for a patient tutor who can visit us at home in Prague 6 twice a week after school hours.",
      postType: "REQUEST", price: "20.00", rateType: "HOURLY", categories: [tutoring],
      location: { country: "Czech Republic", region: "Prague", city: "Prague", street: "Praha 6" },
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Web Development Mentoring — HTML, CSS, JS",
      description: "Offering mentoring for beginners learning web development. I cover HTML, CSS, JavaScript, and intro to React. Structured weekly sessions with homework and code reviews.",
      postType: "OFFER", price: "40.00", rateType: "HOURLY", categories: [tutoring, techSupport],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Spanish Language Lessons Online",
      description: "Native Spanish speaker (from Madrid) offering online lessons for all levels. Conversational focus with grammar foundations. Flexible scheduling including evenings and weekends.",
      postType: "OFFER", price: "22.00", rateType: "HOURLY", categories: [tutoring],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Accountancy & Tax Tutor for Students",
      description: "Qualified accountant offering tutoring for university students in financial accounting, management accounting, and Czech tax law. Mock exams and past paper practice included.",
      postType: "OFFER", price: "45.00", rateType: "HOURLY", categories: [tutoring],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Looking for Chemistry Tutor — Matura Prep",
      description: "Graduating student needing urgent help with chemistry for the state matura exam. Specifically weak in organic chemistry and stoichiometry. Can meet in Brno or do online sessions.",
      postType: "REQUEST", price: null, rateType: null, categories: [tutoring],
    },

    // ── Plumbing ──
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Plumbing Repairs & Installations",
      description: "Professional plumber available for leak repairs, pipe installations, bathroom fitting, and boiler servicing. Available on weekdays and weekends. Fast response and fair pricing.",
      postType: "OFFER", price: "60.00", rateType: "HOURLY", categories: [plumbing, homeRepair],
      location: { country: "Czech Republic", region: "Prague", city: "Prague" },
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Bathroom Renovation — Full Project",
      description: "Complete bathroom renovation service: tiling, plumbing, lighting, and fittings. I manage the whole project from start to finish. Free quote provided after site visit.",
      postType: "OFFER", price: "3500.00", rateType: "FIXED", categories: [plumbing, homeRepair],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Emergency Plumber — Available 24/7",
      description: "Burst pipe? Blocked drain? I offer emergency callout plumbing across Prague and surroundings. Available day and night, including weekends. Fixed callout fee, hourly rate after the first hour.",
      postType: "OFFER", price: "90.00", rateType: "HOURLY", categories: [plumbing],
      location: { country: "Czech Republic", region: "Prague", city: "Prague" },
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Boiler Installation & Servicing",
      description: "Gas-safe registered engineer offering boiler installation, annual servicing, and repairs. All major brands covered. Fully insured with 2-year workmanship guarantee.",
      postType: "OFFER", price: "120.00", rateType: "HOURLY", categories: [plumbing, homeRepair],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Kitchen Sink Keeps Leaking — Need a Plumber",
      description: "The pipe under my kitchen sink has been leaking for a week. I've tried tightening it but the problem persists. Looking for a plumber who can come to Brno centre this week.",
      postType: "REQUEST", price: null, rateType: null, categories: [plumbing],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Radiator Installation Needed — 3 Rooms",
      description: "We've just moved into a new flat and need three new radiators installed and connected to the central heating. Flat is in Prague 2. Looking for a certified plumber with references.",
      postType: "REQUEST", price: "800.00", rateType: "FIXED", categories: [plumbing, homeRepair],
      location: { country: "Czech Republic", region: "Prague", city: "Prague", street: "Praha 2" },
    },

    // ── Design ──
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Logo & Brand Identity Design",
      description: "I design logos, brand guidelines, and visual identities for startups and small businesses. Includes multiple concepts, revisions, and final files in all formats.",
      postType: "OFFER", price: "350.00", rateType: "FIXED", categories: [design],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "UI/UX Design for Mobile App",
      description: "Offering full UI/UX design for mobile apps — wireframes, high-fidelity mockups, and a design system in Figma. I specialise in clean, user-centred interfaces.",
      postType: "OFFER", price: "85.00", rateType: "HOURLY", categories: [design],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Seeking Website Designer for Small Business",
      description: "I run a small plumbing business and need a clean, professional website — 4-5 pages, contact form, and mobile-friendly. Looking for a freelancer who can deliver within 3 weeks.",
      postType: "REQUEST", price: "500.00", rateType: "FIXED", categories: [design, techSupport],
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Social Media Graphics — Instagram & LinkedIn",
      description: "I create eye-catching social media graphics, story templates, and branded content for Instagram, LinkedIn, and Facebook. Monthly packages available for consistent brand presence.",
      postType: "OFFER", price: "250.00", rateType: "FIXED", categories: [design],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Need Flyer & Poster Designed for Event",
      description: "Organising a community music event and need a professionally designed A5 flyer and A3 poster. Should match our existing brand colours. Deadline is 2 weeks from now.",
      postType: "REQUEST", price: "150.00", rateType: "FIXED", categories: [design],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "PowerPoint Presentation Design",
      description: "I transform boring slide decks into polished, professional presentations. Send me your content and I'll handle the visual design. Ideal for business pitches, university defences, and conferences.",
      postType: "OFFER", price: "200.00", rateType: "FIXED", categories: [design],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Print Design — Brochures, Business Cards & Catalogues",
      description: "Experienced print designer offering brochure, business card, and product catalogue design. Files delivered print-ready to your specifications. Fast turnaround available.",
      postType: "OFFER", price: "70.00", rateType: "HOURLY", categories: [design],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Looking for 3D Product Visualisation Designer",
      description: "Need photorealistic 3D renders of a furniture product for e-commerce listings and a trade catalogue. Looking for someone with experience in Blender or Cinema 4D.",
      postType: "REQUEST", price: null, rateType: null, categories: [design],
    },

    // ── Home Repair ──
    {
      authorId: davidProfile.userProfileId,
      postTitle: "General Handyman Services",
      description: "Need something fixed around the house? I handle furniture assembly, painting, shelving, door repairs, and small plumbing jobs. No job too small. Based in Prague, can travel.",
      postType: "OFFER", price: "40.00", rateType: "HOURLY", categories: [homeRepair],
      location: { country: "Czech Republic", region: "Prague", city: "Prague" },
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Painting & Decorating — Interior & Exterior",
      description: "Experienced painter and decorator available for interior and exterior work. Clean, precise, and reliable. I supply all materials or work with yours. Free estimate provided.",
      postType: "OFFER", price: "35.00", rateType: "HOURLY", categories: [homeRepair],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Flat Pack Furniture Assembly",
      description: "I assemble all types of flat-pack furniture — IKEA, JYSK, and others. Fast, careful, and tidy. Available evenings and weekends throughout Prague and Brno.",
      postType: "OFFER", price: "30.00", rateType: "HOURLY", categories: [homeRepair],
      location: { country: "Czech Republic", region: "Prague", city: "Prague" },
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Need Help Hanging Shelves & TV Mount",
      description: "Moving into a new flat and need someone to hang 4 shelves, mount a 55-inch TV, and put up some curtain rails. Should take about 2-3 hours. I have all the fixings.",
      postType: "REQUEST", price: null, rateType: null, categories: [homeRepair],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Roof Inspection & Minor Repairs",
      description: "Qualified roofer offering inspections and minor repair work — replacing tiles, re-sealing flashings, fixing gutters. Available across South Moravia. Report and photos provided.",
      postType: "OFFER", price: "55.00", rateType: "HOURLY", categories: [homeRepair],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Garden Tidying & Landscaping Help Wanted",
      description: "Large overgrown garden that needs a serious tidy-up — cutting back hedges, mowing, removing dead plants, and some basic landscaping. Happy to pay daily rate for 1-2 days of work.",
      postType: "REQUEST", price: "150.00", rateType: "DAILY", categories: [homeRepair],
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Tiling Service — Bathrooms, Kitchens & Floors",
      description: "Professional tiler with 10 years of experience. I do bathroom walls, kitchen splashbacks, floor tiling, and feature walls. Precision work with full prep and grouting included.",
      postType: "OFFER", price: "50.00", rateType: "HOURLY", categories: [homeRepair],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Electrician Needed for Flat Rewire",
      description: "Old flat with outdated wiring needs a full rewire — new consumer unit, sockets, and lighting circuits throughout. Looking for a certified electrician in Brno with references.",
      postType: "REQUEST", price: "2500.00", rateType: "FIXED", categories: [homeRepair],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Window & Door Fitting",
      description: "I supply and fit uPVC and timber windows and doors. All work guaranteed. Free quote following a site visit. Energy-efficient glazing options available.",
      postType: "OFFER", price: null, rateType: null, categories: [homeRepair],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Carpentry — Custom Shelving & Built-ins",
      description: "Bespoke carpentry for built-in wardrobes, custom shelving units, and alcove storage. I design to your space and budget. All timber work finished to a high standard.",
      postType: "OFFER", price: "65.00", rateType: "HOURLY", categories: [homeRepair],
    },

    // ── Cleaning ──
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Office Deep Cleaning — One-off or Regular",
      description: "Professional cleaning for offices and commercial spaces. We handle everything: floors, windows, kitchens, and bathrooms. One-off or regular contracts available. Insured and fully equipped.",
      postType: "OFFER", price: "200.00", rateType: "FIXED", categories: [cleaning],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Home Cleaning — Weekly or Fortnightly",
      description: "Reliable, trustworthy cleaner available for regular home cleaning. I bring my own eco-friendly products. References available. Currently accepting new clients in Prague 1-5.",
      postType: "OFFER", price: "20.00", rateType: "HOURLY", categories: [cleaning],
      location: { country: "Czech Republic", region: "Prague", city: "Prague", street: "Praha 1" },
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "End-of-Tenancy Deep Clean",
      description: "Full end-of-tenancy cleaning to get your deposit back. Includes oven, fridge, bathroom, and all surfaces. Certificate of cleaning provided. Brno and Prague covered.",
      postType: "OFFER", price: "300.00", rateType: "FIXED", categories: [cleaning],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Cleaner Needed After Building Work",
      description: "We've just had a kitchen extension built and the dust is everywhere. Need a thorough post-construction clean — dust, paint splashes, and builder's debris removal. One-off job.",
      postType: "REQUEST", price: null, rateType: null, categories: [cleaning],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Carpet & Upholstery Cleaning",
      description: "Professional hot-water extraction carpet cleaning and upholstery shampooing. Removes stains, odours, and allergens. Same-day drying with our equipment. Brno area.",
      postType: "OFFER", price: "120.00", rateType: "FIXED", categories: [cleaning],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Looking for Regular Cleaner — 3 Hours/Week",
      description: "Busy professional looking for a trustworthy cleaner to come weekly for about 3 hours. Apartment is 65 m2. Prefer someone who brings their own products. Prague 7.",
      postType: "REQUEST", price: "18.00", rateType: "HOURLY", categories: [cleaning],
      location: { country: "Czech Republic", region: "Prague", city: "Prague", street: "Praha 7" },
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "Window Cleaning — Residential & Commercial",
      description: "Internal and external window cleaning for homes and offices. Reach and wash system for upper floors. No streaks guaranteed. Regular contracts at a discounted rate.",
      postType: "OFFER", price: "80.00", rateType: "FIXED", categories: [cleaning],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Airbnb Property Cleaning Between Guests",
      description: "I provide fast, thorough turnaround cleans for Airbnb and holiday let properties. Linen changes, restocking, and a check-out inspection report included. Same-day availability.",
      postType: "OFFER", price: "90.00", rateType: "FIXED", categories: [cleaning],
    },

    // ── Tech Support ──
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Computer Repair & Tech Help Needed",
      description: "My laptop won't boot after a Windows update. I need someone who can come to my home in Brno and diagnose / fix it. I have all the original discs and product keys.",
      postType: "REQUEST", price: null, rateType: null, categories: [techSupport],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "IT Support & Network Setup — Small Business",
      description: "I provide on-site and remote IT support for small businesses: setting up routers and Wi-Fi, NAS storage, printers, and Windows/Mac workstations. Monthly retainer available.",
      postType: "OFFER", price: "70.00", rateType: "HOURLY", categories: [techSupport],
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Website Development — WordPress & Custom",
      description: "Full website development for small businesses and freelancers. WordPress, WooCommerce, or custom HTML/CSS/JS. SEO basics included. Ongoing maintenance packages available.",
      postType: "OFFER", price: "800.00", rateType: "FIXED", categories: [techSupport, design],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Smart Home Setup — Philips Hue, Alexa & More",
      description: "I set up and configure smart home systems: lighting, thermostats, door locks, cameras, and voice assistants. I work with all major platforms — Google Home, Alexa, and Apple HomeKit.",
      postType: "OFFER", price: "60.00", rateType: "HOURLY", categories: [techSupport],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "Old PC Making Loud Noises — Needs Looking At",
      description: "My desktop PC is making a grinding noise and running very slowly. I think it might be the fans or hard drive. Looking for someone who can come to my home in Brno and take a look.",
      postType: "REQUEST", price: null, rateType: null, categories: [techSupport],
      location: { country: "Czech Republic", region: "South Moravian Region", city: "Brno" },
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Data Recovery from Damaged Hard Drive",
      description: "My external hard drive was dropped and is no longer recognised by my Mac. It contains irreplaceable photos and work files. Looking for a data recovery specialist.",
      postType: "REQUEST", price: null, rateType: null, categories: [techSupport],
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Mobile App Development — Android & iOS",
      description: "React Native developer available for mobile app projects. From MVP to full product. I handle design, development, and app store submission. Fixed price or time-and-materials.",
      postType: "OFFER", price: "75.00", rateType: "HOURLY", categories: [techSupport, design],
    },
    {
      authorId: bobProfile.userProfileId,
      postTitle: "CCTV Installation — Home & Business",
      description: "Supply and installation of CCTV systems for homes and small businesses. HD cameras, remote viewing via app, and 24/7 recording. Free security assessment included.",
      postType: "OFFER", price: "500.00", rateType: "FIXED", categories: [techSupport],
    },
    {
      authorId: aliceProfile.userProfileId,
      postTitle: "Excel & Google Sheets Help Needed",
      description: "I need someone to help me build a budget tracking spreadsheet with pivot tables and charts. I have a rough idea of what I want but need a spreadsheet expert to build it properly.",
      postType: "REQUEST", price: "150.00", rateType: "FIXED", categories: [techSupport],
    },
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Cybersecurity Audit for Small Business",
      description: "I offer cybersecurity health checks for small businesses: reviewing passwords, network security, software vulnerabilities, and employee practices. Report and action plan included.",
      postType: "OFFER", price: "400.00", rateType: "FIXED", categories: [techSupport],
    },
    {
      authorId: davidProfile.userProfileId,
      postTitle: "SEO & Google Analytics Setup",
      description: "Looking for someone to set up Google Analytics 4 and Search Console for my e-shop, and do a basic on-page SEO audit. I want to understand where my traffic is coming from.",
      postType: "REQUEST", price: "300.00", rateType: "FIXED", categories: [techSupport, design],
    },

    // ── All categories ──
    {
      authorId: frankProfile.userProfileId,
      postTitle: "Full Property Management & Support Service",
      description: "All-in-one service for landlords and property managers: regular cleaning, minor repairs, plumbing checks, IT setup for tenants, design of rental listings, and tutoring coordination for family tenants. Ideal for busy landlords who want a single point of contact.",
      postType: "OFFER", price: "150.00", rateType: "DAILY", categories: [cleaning, homeRepair, plumbing, techSupport, design, tutoring],
    },
    {
      authorId: elenaProfile.userProfileId,
      postTitle: "Looking for All-round Help After House Move",
      description: "Just moved into a large house and need help across the board: deep clean of the whole property, a plumber to sort the boiler and one leaking tap, a handyman for shelving and painting, someone to set up our home network and smart TV, a designer to help style two rooms, and a tutor for our kids over summer. Happy to hire one person or a small team.",
      postType: "REQUEST", price: null, rateType: null, categories: [cleaning, homeRepair, plumbing, techSupport, design, tutoring],
    },
    {
      authorId: carolProfile.userProfileId,
      postTitle: "Community Centre — Volunteers & Paid Help Wanted",
      description: "Our community centre is looking for people across all skills: tutors for after-school programmes, designers for event materials, IT helpers for our computer suite, cleaners for weekly maintenance, tradespeople for minor repairs and plumbing, and handymen for ongoing upkeep. Flexible hours and fair pay for all roles.",
      postType: "REQUEST", price: "18.00", rateType: "HOURLY", categories: [tutoring, design, techSupport, cleaning, homeRepair, plumbing],
    },
  ];

  const insertedPosts: { postId: string }[] = [];
  let locationCount = 0;

  for (const post of postsData) {
    const { categories: postCategories, location: locationData, ...postValues } = post;

    let locationId: string | undefined;
    if (locationData) {
      const [insertedLocation] = await db
        .insert(schema.locations)
        .values(locationData)
        .returning();
      locationId = insertedLocation!.locationId;
      locationCount++;
    }

    const [inserted] = await db
      .insert(schema.posts)
      .values({ ...postValues, locationId })
      .returning();

    insertedPosts.push(inserted!);

    for (const cat of postCategories) {
      await db
        .insert(schema.postCategories)
        .values({ postId: inserted!.postId, categoryId: cat.categoryId })
        .onConflictDoNothing();
    }
  }

  // Reviews — reviewers must not be the post author
  // postsData indices: 0=Alice math tutoring, 2=Elena python, 10=Bob plumbing,
  //   16=Carol logo design, 24=David handyman, 30=Elena tiling, 33=Frank home cleaning, 40=Elena IT support
  const reviewsData: {
    reviewerId: string;
    postIndex: number;
    rating: number;
    reviewDescription: string | null;
  }[] = [
    { reviewerId: bobProfile.userProfileId,   postIndex: 0,  rating: 5, reviewDescription: "Alice is an incredible tutor — patient, clear, and really knows her stuff. My son went from failing to passing with distinction." },
    { reviewerId: carolProfile.userProfileId, postIndex: 0,  rating: 4, reviewDescription: "Very knowledgeable and well prepared. Sessions were structured and effective. Would recommend for anyone needing maths help." },
    { reviewerId: frankProfile.userProfileId, postIndex: 2,  rating: 5, reviewDescription: "Elena explained Python concepts better than any online course I tried. Highly practical sessions with real project work." },
    { reviewerId: davidProfile.userProfileId, postIndex: 10, rating: 5, reviewDescription: "Bob fixed the leak quickly and left everything spotless. Fair pricing, professional attitude. Will definitely hire again." },
    { reviewerId: aliceProfile.userProfileId, postIndex: 10, rating: 4, reviewDescription: "Good work on the pipes, came the same day I called. Slightly higher price than expected but the quality was there." },
    { reviewerId: elenaProfile.userProfileId, postIndex: 16, rating: 5, reviewDescription: "Carol delivered a stunning brand identity. She truly understood what we were going for. The whole process was smooth and enjoyable." },
    { reviewerId: frankProfile.userProfileId, postIndex: 16, rating: 4, reviewDescription: "Solid design work and responsive communication. Minor revisions were handled quickly. Very happy with the final logo." },
    { reviewerId: carolProfile.userProfileId, postIndex: 24, rating: 5, reviewDescription: "David assembled all our IKEA furniture in half the time I expected. Tidy, efficient, and really friendly. Great value." },
    { reviewerId: bobProfile.userProfileId,   postIndex: 24, rating: 3, reviewDescription: "Did a decent job overall but was about an hour late and didn't bring the right screwdriver. Had to pop out to get one." },
    { reviewerId: elenaProfile.userProfileId, postIndex: 33, rating: 5, reviewDescription: "Frank cleaned our flat to an absolutely immaculate standard. Even areas we'd forgotten about were spotless. Highly recommended." },
    { reviewerId: davidProfile.userProfileId, postIndex: 40, rating: 4, reviewDescription: "Elena set up our office network quickly and explained everything clearly. Very knowledgeable. Will use again for future IT needs." },
  ];

  for (const review of reviewsData) {
    const postId = insertedPosts[review.postIndex]?.postId;
    if (!postId) {
      continue;
    }
    await db.insert(schema.reviews).values({
      reviewerId: review.reviewerId,
      postId,
      rating: review.rating,
      reviewDescription: review.reviewDescription,
    });
  }

  console.log("✅ Seeded:");
  console.log("   2 roles");
  console.log("   6 users + profiles (password: password123)");
  console.log("   6 categories (3 posts with all categories included)");
  console.log(`   ${postsData.length} posts (${locationCount} with locations)`);
  console.log(`   ${reviewsData.length} reviews`);

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
