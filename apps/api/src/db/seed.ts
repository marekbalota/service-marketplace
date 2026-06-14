/**
 * Production-like seed.
 *
 * Generates a realistic, sizeable dataset: 500+ accounts (some with up to 4
 * profiles), 2000 posts spread across them, plus reviews, favourites, message
 * threads, reports and bans. Real photos are downloaded once at seed time and
 * uploaded to MinIO so they are served locally (offline-safe at presentation).
 *
 * Strategy: FULL WIPE then regenerate. The well-known accounts the e2e suite
 * depends on (alice@example.com, admin@example.com, unverified@example.com) are
 * always recreated with their expected credentials.
 *
 * Performance: passwords are hashed once and the hash reused for every bulk
 * account; all inserts are batched (chunked multi-row) rather than row-by-row.
 *
 * Run: `bun run db:seed` (from apps/api) or `bun --env-file=../../.env run src/db/seed.ts`.
 */
import { fakerCS_CZ, fakerSK, fakerEN } from '@faker-js/faker'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import {
  type Lang,
  LANGS,
  serviceTemplates,
  offerExtras,
  requestExtras,
  reviewTexts,
  conversationScripts,
  bioTemplates,
  jobTitles,
  banReasons,
  harmfulPosts,
  harmfulThreads,
  harmfulReviews,
} from './seed-content'
import { db, client } from './index'
import { auth } from '../modules/auth/service'
import { Permissions } from '@marketplace/shared'
import { redis } from '../lib/redis'
import { minioClient, initBucket } from '../lib/storage'
import { fetchGeoapifyFeatures } from '../lib/geoapify'
import { env } from '../lib/env'

// ── Faker setup (deterministic for reproducibility) ──────────────────────────

const langFakers: Record<Lang, typeof fakerEN> = {
  cs: fakerCS_CZ,
  sk: fakerSK,
  en: fakerEN,
}
for (const f of Object.values(langFakers)) f.seed(20260614)
const faker = fakerCS_CZ // default instance for language-agnostic helpers (numbers, dates, picks)

// ── Small helpers ────────────────────────────────────────────────────────────

const randInt = (min: number, max: number) => faker.number.int({ min, max })
const chance = (p: number) => faker.number.float() < p
const pick = <T>(arr: readonly T[]): T => faker.helpers.arrayElement(arr)
const pickSome = <T>(arr: readonly T[], min: number, max: number): T[] =>
  faker.helpers.arrayElements(arr, randInt(min, max))

/** Weighted choice: pairs of [value, weight]. */
function weighted<T>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = faker.number.float({ min: 0, max: total })
  for (const [v, w] of pairs) {
    if (r < w) return v
    r -= w
  }
  return pairs[pairs.length - 1]![0]
}

/** Postgres caps parameters per statement; chunk multi-row inserts. */
async function insertChunked<T>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  chunkSize = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    if (slice.length === 0) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(slice as any)
  }
}

// ── Static reference data ────────────────────────────────────────────────────

const permissionDefinitions = [
  { name: Permissions.PostsCreate, description: 'Create new posts' },
  { name: Permissions.PostsEditOwn, description: 'Edit own posts' },
  { name: Permissions.PostsEditAny, description: 'Edit any post' },
  { name: Permissions.PostsDeleteOwn, description: 'Delete own posts' },
  { name: Permissions.AdminPostsDeleteAny, description: 'Delete any post' },
  { name: Permissions.AdminUsersBan, description: 'Ban and unban users' },
  { name: Permissions.AdminUsersView, description: 'View user list' },
  { name: Permissions.AdminUsersAssignRole, description: 'Assign roles to users' },
  { name: Permissions.AdminUsersImpersonate, description: 'Impersonate users' },
  { name: Permissions.AdminRolesManage, description: 'Create, edit, delete roles' },
  { name: Permissions.AdminCategoriesManage, description: 'Manage categories' },
  { name: Permissions.AdminReportsManage, description: 'View and manage reports' },
  { name: Permissions.AdminStatsView, description: 'View admin dashboard stats' },
  { name: Permissions.AdminAnalyticsView, description: 'View analytics data' },
]

/** 55 categories; ~half carry sk/cs translations (the rest are EN-only). */
const categoryDefs: { en: string; sk?: string; cs?: string }[] = [
  { en: 'Tutoring', sk: 'Doučovanie', cs: 'Doučování' },
  { en: 'Plumbing', sk: 'Inštalatérstvo', cs: 'Instalatérství' },
  { en: 'Design', sk: 'Dizajn', cs: 'Design' },
  { en: 'Home Repair', sk: 'Opravy domácnosti', cs: 'Opravy domácnosti' },
  { en: 'Cleaning', sk: 'Upratovanie', cs: 'Úklid' },
  { en: 'Tech Support', sk: 'Technická podpora', cs: 'Technická podpora' },
  { en: 'Marketing & Business', sk: 'Marketing a biznis', cs: 'Marketing a byznys' },
  { en: 'Writing & Translation', sk: 'Písanie a preklady', cs: 'Psaní a překlady' },
  { en: 'Pet Services', sk: 'Starostlivosť o zvieratá', cs: 'Péče o zvířata' },
  { en: 'Photography & Video', sk: 'Fotografia a video', cs: 'Fotografie a video' },
  { en: 'Beauty & Wellness', sk: 'Krása a wellness', cs: 'Krása a wellness' },
  { en: 'Gardening & Landscaping', sk: 'Záhradníctvo', cs: 'Zahradnictví' },
  { en: 'Electrical Work', sk: 'Elektrikárske práce', cs: 'Elektrikářské práce' },
  { en: 'Carpentry', sk: 'Stolárstvo', cs: 'Truhlářství' },
  { en: 'Painting & Decorating', sk: 'Maľovanie', cs: 'Malování' },
  { en: 'Moving & Removals', sk: 'Sťahovanie', cs: 'Stěhování' },
  { en: 'Transport & Delivery', sk: 'Doprava a doručenie', cs: 'Doprava a doručení' },
  { en: 'Automotive', sk: 'Autoservis', cs: 'Autoservis' },
  { en: 'Events & Entertainment', sk: 'Podujatia a zábava', cs: 'Akce a zábava' },
  { en: 'Music Lessons', sk: 'Hudobné lekcie', cs: 'Hudební lekce' },
  { en: 'Childcare', sk: 'Starostlivosť o deti', cs: 'Hlídání dětí' },
  { en: 'Elderly Care', sk: 'Opatrovanie seniorov', cs: 'Péče o seniory' },
  { en: 'Legal Services', sk: 'Právne služby', cs: 'Právní služby' },
  { en: 'Accounting & Tax', sk: 'Účtovníctvo a dane', cs: 'Účetnictví a daně' },
  { en: 'Fitness & Personal Training', sk: 'Fitness a tréning', cs: 'Fitness a trénink' },
  { en: 'Web Development', sk: 'Vývoj webu', cs: 'Vývoj webu' },
  { en: 'Graphic Design', sk: 'Grafický dizajn', cs: 'Grafický design' },
  { en: 'Catering & Cooking', sk: 'Catering a varenie', cs: 'Catering a vaření' },
  { en: 'Tailoring & Sewing', sk: 'Krajčírstvo', cs: 'Krejčovství' },
  { en: 'Locksmith', sk: 'Zámočníctvo', cs: 'Zámečnictví' },
  // EN-only from here on
  { en: 'Roofing' },
  { en: 'Flooring & Tiling' },
  { en: 'Window Cleaning' },
  { en: 'Appliance Repair' },
  { en: 'IT Consulting' },
  { en: 'SEO & Digital Marketing' },
  { en: 'Social Media Management' },
  { en: 'Voice Over & Audio' },
  { en: 'Video Editing' },
  { en: '3D Modelling & Rendering' },
  { en: 'Architecture & Drafting' },
  { en: 'Interior Design' },
  { en: 'Massage Therapy' },
  { en: 'Hairdressing' },
  { en: 'Makeup Artistry' },
  { en: 'Nail Care' },
  { en: 'Dog Walking' },
  { en: 'Pet Grooming' },
  { en: 'House Sitting' },
  { en: 'Virtual Assistance' },
  { en: 'Data Entry' },
  { en: 'Bookkeeping' },
  { en: 'Language Lessons' },
  { en: 'Exam Preparation' },
  { en: 'Other Services' },
]

/** CZ/SK city pool — inserted once, reused as post & profile locations. */
const cityPool: { city: string; region: string; country: string }[] = [
  { city: 'Praha', region: 'Praha', country: 'Czechia' },
  { city: 'Brno', region: 'South Moravian Region', country: 'Czechia' },
  { city: 'Ostrava', region: 'Moravian-Silesian Region', country: 'Czechia' },
  { city: 'Plzeň', region: 'Plzeň Region', country: 'Czechia' },
  { city: 'Liberec', region: 'Liberec Region', country: 'Czechia' },
  { city: 'Olomouc', region: 'Olomouc Region', country: 'Czechia' },
  { city: 'České Budějovice', region: 'South Bohemian Region', country: 'Czechia' },
  { city: 'Hradec Králové', region: 'Hradec Králové Region', country: 'Czechia' },
  { city: 'Ústí nad Labem', region: 'Ústí nad Labem Region', country: 'Czechia' },
  { city: 'Pardubice', region: 'Pardubice Region', country: 'Czechia' },
  { city: 'Zlín', region: 'Zlín Region', country: 'Czechia' },
  { city: 'Jihlava', region: 'Vysočina Region', country: 'Czechia' },
  { city: 'Karlovy Vary', region: 'Karlovy Vary Region', country: 'Czechia' },
  { city: 'Kladno', region: 'Central Bohemian Region', country: 'Czechia' },
  { city: 'Most', region: 'Ústí nad Labem Region', country: 'Czechia' },
  { city: 'Opava', region: 'Moravian-Silesian Region', country: 'Czechia' },
  { city: 'Frýdek-Místek', region: 'Moravian-Silesian Region', country: 'Czechia' },
  { city: 'Děčín', region: 'Ústí nad Labem Region', country: 'Czechia' },
  { city: 'Teplice', region: 'Ústí nad Labem Region', country: 'Czechia' },
  { city: 'Tábor', region: 'South Bohemian Region', country: 'Czechia' },
  { city: 'Bratislava', region: 'Bratislava Region', country: 'Slovakia' },
  { city: 'Košice', region: 'Košice Region', country: 'Slovakia' },
  { city: 'Prešov', region: 'Prešov Region', country: 'Slovakia' },
  { city: 'Žilina', region: 'Žilina Region', country: 'Slovakia' },
  { city: 'Nitra', region: 'Nitra Region', country: 'Slovakia' },
  { city: 'Banská Bystrica', region: 'Banská Bystrica Region', country: 'Slovakia' },
  { city: 'Trnava', region: 'Trnava Region', country: 'Slovakia' },
  { city: 'Trenčín', region: 'Trenčín Region', country: 'Slovakia' },
  { city: 'Martin', region: 'Žilina Region', country: 'Slovakia' },
  { city: 'Poprad', region: 'Prešov Region', country: 'Slovakia' },
  { city: 'Prievidza', region: 'Trenčín Region', country: 'Slovakia' },
  { city: 'Zvolen', region: 'Banská Bystrica Region', country: 'Slovakia' },
  { city: 'Považská Bystrica', region: 'Trenčín Region', country: 'Slovakia' },
  { city: 'Nové Zámky', region: 'Nitra Region', country: 'Slovakia' },
  { city: 'Michalovce', region: 'Košice Region', country: 'Slovakia' },
]

// ── Image pool (downloaded once, served from MinIO) ──────────────────────────

interface ImagePool {
  avatars: string[]
  posts: string[]
}

async function uploadFromUrl(srcUrl: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(srcUrl)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    await minioClient.putObject(env.minio.bucket, key, buf, buf.length, {
      'Content-Type': 'image/jpeg',
    })
    return `${env.minio.publicUrl}/${env.minio.bucket}/${key}`
  } catch {
    return null
  }
}

/** Download a curated pool of real photos and host them on MinIO. Best-effort:
 *  on any failure the pool is simply smaller (or empty) and the seed continues. */
async function buildImagePool(): Promise<ImagePool> {
  const pool: ImagePool = { avatars: [], posts: [] }
  try {
    await initBucket()
  } catch (err) {
    console.warn('  ⚠ MinIO unavailable — seeding without images.', err)
    return pool
  }

  console.log('  Downloading & hosting avatar pool (randomuser.me)...')
  const avatarSources: string[] = []
  for (let i = 0; i < 50; i++) {
    avatarSources.push(`https://randomuser.me/api/portraits/men/${i}.jpg`)
    avatarSources.push(`https://randomuser.me/api/portraits/women/${i}.jpg`)
  }
  // ~100 unique faces, uploaded with limited concurrency
  await mapWithConcurrency(avatarSources, 12, async (srcUrl, idx) => {
    const url = await uploadFromUrl(srcUrl, `seed/avatars/${idx}.jpg`)
    if (url) pool.avatars.push(url)
  })

  console.log('  Downloading & hosting post photo pool (picsum.photos)...')
  const postSources = Array.from(
    { length: 80 },
    (_, i) => `https://picsum.photos/seed/mkt-${i}/800/600`,
  )
  await mapWithConcurrency(postSources, 12, async (srcUrl, idx) => {
    const url = await uploadFromUrl(srcUrl, `seed/posts/${idx}.jpg`)
    if (url) pool.posts.push(url)
  })

  console.log(`  Hosted ${pool.avatars.length} avatars, ${pool.posts.length} post photos on MinIO.`)
  return pool
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      await fn(items[idx]!, idx)
    }
  })
  await Promise.all(workers)
}

// ── Geocoding (Geoapify) ─────────────────────────────────────────────────────

interface GeoIds {
  cityExternalId: string | null
  regionExternalId: string | null
  countryExternalId: string | null
}

/** Geoapify language per country so native spellings (Plzeň, Žilina) match. */
const langForCountry = (country: string) =>
  country === 'Czechia' ? 'cs' : country === 'Slovakia' ? 'sk' : 'en'

/**
 * Resolve a Geoapify place_id for a query, taking the first feature of the
 * expected admin level that carries one. Lenient on purpose — we just need a
 * valid id per location. Memoised in `cache` (region/country repeat across the
 * city pool) and persisted in Redis for 24h so reruns make zero API calls.
 */
async function geocodeOne(
  query: string,
  level: 'city' | 'region' | 'country',
  lang: string,
  cache: Map<string, string | null>,
): Promise<string | null> {
  const cacheKey = `seed:geo:${level}:${query}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null
  const fromRedis = await redis.get(cacheKey)
  if (fromRedis) {
    cache.set(cacheKey, fromRedis)
    return fromRedis
  }
  try {
    const features = await fetchGeoapifyFeatures(query, lang, 5)
    const wantType = level === 'region' ? 'state' : level
    const match =
      features.find((f) => f.properties.result_type === wantType && f.properties.place_id) ??
      features.find((f) => f.properties.place_id)
    const placeId = (match?.properties.place_id as string | undefined) ?? null
    cache.set(cacheKey, placeId)
    if (placeId) await redis.set(cacheKey, placeId, 'EX', 24 * 60 * 60)
    return placeId
  } catch {
    cache.set(cacheKey, null)
    return null
  }
}

async function geocodeCityPool(): Promise<GeoIds[]> {
  const cache = new Map<string, string | null>()
  const results: GeoIds[] = []
  let resolved = 0
  for (const c of cityPool) {
    const lang = langForCountry(c.country)
    const cityExternalId = await geocodeOne(`${c.city}, ${c.country}`, 'city', lang, cache)
    const regionExternalId = await geocodeOne(`${c.region}, ${c.country}`, 'region', 'en', cache)
    const countryExternalId = await geocodeOne(c.country, 'country', 'en', cache)
    if (cityExternalId) resolved++
    results.push({ cityExternalId, regionExternalId, countryExternalId })
  }
  console.log(`  Geocoded ${resolved}/${cityPool.length} cities via Geoapify.`)
  return results
}

// ── Wipe ─────────────────────────────────────────────────────────────────────

async function wipe(): Promise<void> {
  console.log('  Wiping existing data (report_categories preserved)...')
  await db.execute(sql`TRUNCATE TABLE
    messages, message_threads, reports, review_images, reviews,
    favourites, post_categories, posts, profile_locations, images,
    user_profiles, user_backup_code, user_totp_credential, user_two_factor_method,
    "session", account, verification, "user",
    role_permissions, roles, permissions,
    categories, category_translations, locations
    RESTART IDENTITY CASCADE`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface DemoAccount {
  name: string
  email: string
  password: string
  roleName: 'User' | 'Moderator' | 'Admin' | 'SuperAdmin'
  emailVerified: boolean
}

async function seed() {
  console.log('🌱 Seeding database (production-like)...\n')

  const authContext = await auth.$context
  // Bun's native scrypt occasionally throws a transient malloc failure under
  // memory pressure; retry a couple of times before giving up.
  const hashPassword = async (pw: string): Promise<string> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await authContext.password.hash(pw)
      } catch (err) {
        if (attempt >= 3) throw err
        await new Promise((r) => setTimeout(r, 250))
      }
    }
  }
  const defaultHash = await hashPassword('password123')
  const adminHash = await hashPassword('admin123')

  await wipe()

  // ── Permissions ──
  console.log('  Seeding permissions & roles...')
  const insertedPerms = await db
    .insert(schema.permissions)
    .values(permissionDefinitions)
    .returning()
  const permByName = new Map(insertedPerms.map((p) => [p.name, p.permissionId]))

  // ── Roles ──
  const [userRole] = await db
    .insert(schema.roles)
    .values({ name: 'User', description: 'Regular user', priority: 0, isDefault: true })
    .returning()
  const [moderatorRole] = await db
    .insert(schema.roles)
    .values({ name: 'Moderator', description: 'Moderates posts, reports and users', priority: 1 })
    .returning()
  const [adminRole] = await db
    .insert(schema.roles)
    .values({ name: 'Admin', description: 'Administrator with full access', priority: 2 })
    .returning()
  const [superAdminRole] = await db
    .insert(schema.roles)
    .values({ name: 'SuperAdmin', description: 'Super administrator', priority: 3 })
    .returning()

  const allPermNames = permissionDefinitions.map((p) => p.name)
  const moderatorPermNames = [
    Permissions.PostsCreate,
    Permissions.PostsEditOwn,
    Permissions.PostsDeleteOwn,
    Permissions.AdminPostsDeleteAny,
    Permissions.AdminUsersView,
    Permissions.AdminUsersBan,
    Permissions.AdminReportsManage,
    Permissions.AdminStatsView,
  ]
  const rolePermRows: { roleId: string; permissionId: string }[] = []
  const addRolePerms = (roleId: string, names: string[]) => {
    for (const n of names) {
      const pid = permByName.get(n)
      if (pid) rolePermRows.push({ roleId, permissionId: pid })
    }
  }
  addRolePerms(userRole!.roleId, [
    Permissions.PostsCreate,
    Permissions.PostsEditOwn,
    Permissions.PostsDeleteOwn,
  ])
  addRolePerms(moderatorRole!.roleId, moderatorPermNames)
  addRolePerms(adminRole!.roleId, allPermNames)
  addRolePerms(superAdminRole!.roleId, allPermNames)
  await db.insert(schema.rolePermissions).values(rolePermRows)

  const roleByName = {
    User: userRole!.roleId,
    Moderator: moderatorRole!.roleId,
    Admin: adminRole!.roleId,
    SuperAdmin: superAdminRole!.roleId,
  }

  // ── Image pool ──
  const imagePool = await buildImagePool()

  // ── Categories ──
  console.log('  Seeding categories...')
  const catRows = categoryDefs.map(() => ({}))
  const insertedCats = await db.insert(schema.categories).values(catRows).returning()
  const catTranslations: { categoryId: string; locale: string; name: string }[] = []
  insertedCats.forEach((c, i) => {
    const def = categoryDefs[i]!
    catTranslations.push({ categoryId: c.categoryId, locale: 'en', name: def.en })
    if (def.sk) catTranslations.push({ categoryId: c.categoryId, locale: 'sk', name: def.sk })
    if (def.cs) catTranslations.push({ categoryId: c.categoryId, locale: 'cs', name: def.cs })
  })
  await insertChunked(schema.categoryTranslations, catTranslations)
  const categoryIds = insertedCats.map((c) => c.categoryId)
  const catIdByEn = new Map(categoryDefs.map((d, i) => [d.en, insertedCats[i]!.categoryId]))

  // ── Locations (with Geoapify external ids) ──
  console.log('  Seeding locations...')
  const geoIds = await geocodeCityPool()
  const insertedLocations = await db
    .insert(schema.locations)
    .values(
      cityPool.map((c, i) => ({
        city: c.city,
        region: c.region,
        country: c.country,
        cityExternalId: geoIds[i]!.cityExternalId,
        regionExternalId: geoIds[i]!.regionExternalId,
        countryExternalId: geoIds[i]!.countryExternalId,
      })),
    )
    .returning()

  // ── Accounts + profiles ──
  console.log('  Generating accounts & profiles...')

  const demoAccounts: DemoAccount[] = [
    // e2e-critical (must keep exact creds)
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123', roleName: 'User', emailVerified: true },
    { name: 'Super Admin', email: 'admin@example.com', password: 'admin123', roleName: 'SuperAdmin', emailVerified: true },
    { name: 'Unverified User', email: 'unverified@example.com', password: 'password123', roleName: 'User', emailVerified: false },
    // Clean role-named demo logins (all password123)
    { name: 'Demo User', email: 'user@example.com', password: 'password123', roleName: 'User', emailVerified: true },
    { name: 'Demo Moderator', email: 'moderator@example.com', password: 'password123', roleName: 'Moderator', emailVerified: true },
    { name: 'Demo Administrator', email: 'administrator@example.com', password: 'password123', roleName: 'Admin', emailVerified: true },
    { name: 'Demo SuperAdmin', email: 'superadmin@example.com', password: 'password123', roleName: 'SuperAdmin', emailVerified: true },
  ]

  type UserRow = typeof schema.users.$inferInsert
  type AccountRow = typeof schema.oauthAccounts.$inferInsert
  type ProfileRow = typeof schema.userProfiles.$inferInsert

  const userRows: UserRow[] = []
  const accountRows: AccountRow[] = []
  // profiles built after we know user ids; language is inherited from the account
  // so a profile's posts/bio stay in one consistent language.
  const profileSpecs: { accountId: string; name: string; email: string; lang: Lang }[] = []

  const usedEmails = new Set<string>()
  const uniqueEmail = (base: string): string => {
    let e = base.toLowerCase()
    let n = 1
    while (usedEmails.has(e)) {
      e = base.toLowerCase().replace('@', `${n}@`)
      n++
    }
    usedEmails.add(e)
    return e
  }

  // Demo accounts first
  for (const d of demoAccounts) {
    const id = crypto.randomUUID()
    const createdAt = faker.date.past({ years: 2 })
    usedEmails.add(d.email)
    userRows.push({
      id,
      name: d.name,
      email: d.email,
      emailVerified: d.emailVerified,
      createdAt,
      updatedAt: createdAt,
      roleId: roleByName[d.roleName],
    })
    accountRows.push({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: d.password === 'admin123' ? adminHash : defaultHash,
      createdAt,
      updatedAt: createdAt,
    })
    profileSpecs.push({ accountId: id, name: d.name, email: d.email, lang: 'en' })
  }

  // Bulk accounts. Each account gets one language (CZ heaviest, then SK, then EN);
  // its name, bio, posts, and the messages on its posts all use that language.
  const BULK_ACCOUNTS = 500
  let bannedCount = 0
  for (let i = 0; i < BULK_ACCOUNTS; i++) {
    const lang = weighted<Lang>([
      ['cs', 55],
      ['sk', 30],
      ['en', 15],
    ])
    const f = langFakers[lang]
    const firstName = f.person.firstName()
    const lastName = f.person.lastName()
    const fullName = `${firstName} ${lastName}`
    const id = crypto.randomUUID()
    const createdAt = faker.date.past({ years: 2 })
    const email = uniqueEmail(
      faker.internet.email({ firstName, lastName, provider: pick(['gmail.com', 'seznam.cz', 'centrum.cz', 'outlook.com', 'azet.sk']) }),
    )
    // ~3% of users are banned, with a specific, meaningful reason
    const banned = chance(0.03)
    if (banned) bannedCount++
    const banExpiration = banned ? (chance(0.4) ? null : faker.date.future({ years: 1 })) : null
    userRows.push({
      id,
      name: fullName,
      email,
      emailVerified: chance(0.95),
      createdAt,
      updatedAt: createdAt,
      roleId: roleByName.User,
      image: imagePool.avatars.length ? pick(imagePool.avatars) : null,
      isBanned: banned,
      banReason: banned ? pick(banReasons) : null,
      banExpiration,
    })
    accountRows.push({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: defaultHash,
      createdAt,
      updatedAt: createdAt,
    })

    // 1–4 profiles, weighted toward 1
    const profileCount = weighted<number>([
      [1, 70],
      [2, 18],
      [3, 8],
      [4, 4],
    ])
    for (let p = 0; p < profileCount; p++) {
      const business = p > 0 && chance(0.5)
      const pName = business ? f.company.name() : p === 0 ? fullName : `${f.person.firstName()} ${lastName}`
      const pEmail = uniqueEmail(faker.internet.email({ firstName: pName.split(' ')[0]!, lastName }))
      profileSpecs.push({ accountId: id, name: pName, email: pEmail, lang })
    }
  }

  console.log(`  Inserting ${userRows.length} users & accounts...`)
  await insertChunked(schema.users, userRows)
  await insertChunked(schema.oauthAccounts, accountRows)

  // Build profile rows (bio for ~95%, phone for most, fax for few)
  console.log(`  Inserting ${profileSpecs.length} profiles...`)
  const profileLang = new Map<string, Lang>()
  const profileRows: (ProfileRow & { userProfileId: string })[] = profileSpecs.map((s) => {
    const userProfileId = crypto.randomUUID()
    profileLang.set(userProfileId, s.lang)
    const job = pick(jobTitles[s.lang])
    const city = pick(cityPool).city
    const bio = chance(0.95)
      ? pick(bioTemplates[s.lang])
          .replace('{name}', s.name.split(' ')[0]!)
          .replace('{job}', job)
          .replace('{city}', city)
          .replace('{years}', String(randInt(3, 25)))
      : null
    return {
      userProfileId,
      accountId: s.accountId,
      name: s.name,
      email: s.email,
      bio,
      phoneNumber: chance(0.85)
        ? `+${pick(['420', '421'])} ${randInt(600, 799)} ${randInt(100, 999)} ${randInt(100, 999)}`
        : null,
      fax: chance(0.08) ? `+420 ${randInt(200, 599)} ${randInt(100, 999)} ${randInt(100, 999)}` : null,
    }
  })
  await insertChunked(schema.userProfiles, profileRows)

  // ── Profile avatar images (images row + profileImageId) ──
  const profileIds = profileRows.map((p) => p.userProfileId)
  // Profiles grouped by language — used to keep harmful (English) content consistent
  const profilesByLang: Record<Lang, string[]> = { en: [], cs: [], sk: [] }
  for (const pid of profileIds) profilesByLang[profileLang.get(pid)!].push(pid)
  if (imagePool.avatars.length) {
    console.log('  Attaching profile avatars...')
    const imageRows: { imageId: string; userProfileId: string; name: string; link: string }[] = []
    const profileImageUpdates: { profileId: string; imageId: string }[] = []
    for (const p of profileRows) {
      if (!chance(0.85)) continue // ~15% have no avatar (fallback initials)
      const imageId = crypto.randomUUID()
      imageRows.push({
        imageId,
        userProfileId: p.userProfileId,
        name: 'avatar.jpg',
        link: pick(imagePool.avatars),
      })
      profileImageUpdates.push({ profileId: p.userProfileId, imageId })
    }
    await insertChunked(schema.images, imageRows)
    // Set profileImageId via batched CASE update
    for (let i = 0; i < profileImageUpdates.length; i += 500) {
      const slice = profileImageUpdates.slice(i, i + 500)
      const ids = slice.map((s) => s.profileId)
      const cases = sql.join(
        slice.map((s) => sql`when ${schema.userProfiles.userProfileId} = ${s.profileId} then ${s.imageId}::uuid`),
        sql` `,
      )
      await db
        .update(schema.userProfiles)
        .set({ profileImageId: sql`case ${cases} end` })
        .where(sql`${schema.userProfiles.userProfileId} in ${ids}`)
    }
  }

  // ── Profile locations ──
  console.log('  Linking profile locations...')
  const profileLocRows: { userProfileId: string; locationId: string }[] = []
  for (const pid of profileIds) {
    if (chance(0.7)) {
      profileLocRows.push({ userProfileId: pid, locationId: pick(insertedLocations).locationId })
    }
  }
  await insertChunked(schema.profileLocations, profileLocRows)

  // ── Posts ──
  // Each post uses a localized service template in its author's language, so the
  // title, body, and every message/review on it stay consistent.
  console.log('  Generating 2000 posts...')
  type PostRow = typeof schema.posts.$inferInsert
  const POST_COUNT = 2000
  const postRows: (PostRow & { postId: string })[] = []
  const postCategoryRows: { postId: string; categoryId: string }[] = []
  const postLang = new Map<string, Lang>()

  const buildPost = (
    authorId: string,
    lang: Lang,
    opts: { banned?: boolean; softDeleted?: boolean } = {},
  ) => {
    const tpl = pick(serviceTemplates[lang])
    const isOffer = chance(0.6)
    const postId = crypto.randomUUID()
    const createdAt = faker.date.past({ years: 1 })
    const extras = isOffer ? offerExtras[lang] : requestExtras[lang]
    const title = isOffer ? tpl.offerTitle : tpl.requestTitle
    const body = isOffer ? tpl.offerBody : tpl.requestBody
    const description = `${body} ${faker.helpers.arrayElements(extras, randInt(1, 2)).join(' ')}`

    const hasPrice = isOffer ? chance(0.85) : chance(0.35)
    const rateType = hasPrice ? weighted([['HOURLY', 60], ['FIXED', 30], ['DAILY', 10]]) : null
    let price: string | null = null
    if (hasPrice) {
      if (rateType === 'HOURLY') price = `${randInt(12, 120)}.00`
      else if (rateType === 'DAILY') price = `${randInt(80, 600)}.00`
      else price = `${randInt(50, 5000)}.00`
    }

    const banned = opts.banned ?? chance(0.03)
    const softDeleted = opts.softDeleted ?? (!banned && chance(0.02))

    postRows.push({
      postId,
      authorId,
      locationId: chance(0.75) ? pick(insertedLocations).locationId : null,
      postTitle: title,
      description,
      postType: isOffer ? 'OFFER' : 'REQUEST',
      price,
      rateType: rateType as 'HOURLY' | 'DAILY' | 'FIXED' | null,
      createdAt,
      bannedAt: banned ? faker.date.recent({ days: 60 }) : null,
      banReason: banned ? pick(banReasons) : null,
      deletedAt: softDeleted ? faker.date.recent({ days: 90 }) : null,
    })
    postLang.set(postId, lang)

    // Primary (meaningful) category from the template + an occasional extra tag
    postCategoryRows.push({ postId, categoryId: catIdByEn.get(tpl.category)! })
    if (chance(0.4)) {
      const extra = pick(categoryIds)
      if (extra !== catIdByEn.get(tpl.category)) postCategoryRows.push({ postId, categoryId: extra })
    }
    return postId
  }

  for (let i = 0; i < POST_COUNT; i++) {
    const authorId = pick(profileIds)
    buildPost(authorId, profileLang.get(authorId)!)
  }

  console.log('  Inserting posts & post_categories...')
  await insertChunked(schema.posts, postRows)
  await insertChunked(schema.postCategories, postCategoryRows)

  const activePosts = postRows.filter((p) => !p.deletedAt && !p.bannedAt)
  const activeEnglishPosts = activePosts.filter((p) => postLang.get(p.postId) === 'en')

  // ── Favourites ──
  console.log('  Generating favourites...')
  const favSet = new Set<string>()
  const favRows: { userProfileId: string; postId: string }[] = []
  for (const pid of profileIds) {
    const count = weighted<number>([[0, 35], [1, 20], [2, 15], [5, 20], [12, 10]])
    for (let k = 0; k < count; k++) {
      const post = pick(activePosts)
      if (post.authorId === pid) continue
      const key = `${pid}:${post.postId}`
      if (favSet.has(key)) continue
      favSet.add(key)
      favRows.push({ userProfileId: pid, postId: post.postId })
    }
  }
  await insertChunked(schema.favourites, favRows)

  // ── Reviews ──
  console.log('  Generating reviews...')
  type ReviewRow = typeof schema.reviews.$inferInsert
  const reviewRows: (ReviewRow & { reviewId: string })[] = []
  for (const post of activePosts) {
    const lang = postLang.get(post.postId)!
    const texts = reviewTexts[lang]
    const count = weighted<number>([[0, 35], [1, 25], [2, 20], [3, 12], [4, 5], [6, 3]])
    const usedReviewers = new Set<string>([post.authorId])
    for (let k = 0; k < count; k++) {
      const reviewerId = pick(profileIds)
      if (usedReviewers.has(reviewerId)) continue
      usedReviewers.add(reviewerId)
      const rating = weighted<number>([[5, 40], [4, 30], [3, 15], [2, 10], [1, 5]])
      const body =
        rating >= 4 ? pick(texts.positive) : rating === 3 ? pick(texts.mixed) : pick(texts.negative)
      reviewRows.push({
        reviewId: crypto.randomUUID(),
        reviewerId,
        postId: post.postId,
        rating,
        reviewDescription: chance(0.85) ? body : null,
        createdAt: faker.date.recent({ days: 300 }),
      })
    }
  }
  await insertChunked(schema.reviews, reviewRows)

  // ── Review images (~10% of reviews) ──
  if (imagePool.posts.length) {
    console.log('  Attaching review images...')
    const reviewImageRows: { reviewId: string; name: string; link: string }[] = []
    for (const r of reviewRows) {
      if (chance(0.1)) {
        reviewImageRows.push({ reviewId: r.reviewId, name: 'photo.jpg', link: pick(imagePool.posts) })
      }
    }
    await insertChunked(schema.reviewImages, reviewImageRows)
  }

  // ── Message threads & messages ──
  console.log('  Generating message threads & messages...')
  type ThreadRow = typeof schema.messageThreads.$inferInsert
  const threadRows: (ThreadRow & { threadId: string; authorId: string })[] = []
  const threadKeys = new Set<string>()
  const THREAD_TARGET = 1500
  let attempts = 0
  while (threadRows.length < THREAD_TARGET && attempts < THREAD_TARGET * 4) {
    attempts++
    const post = pick(activePosts)
    const initiatorId = pick(profileIds)
    if (initiatorId === post.authorId) continue
    const key = `${post.postId}:${initiatorId}`
    if (threadKeys.has(key)) continue
    threadKeys.add(key)
    threadRows.push({
      threadId: crypto.randomUUID(),
      postId: post.postId,
      initiatorId,
      authorId: post.authorId,
      createdAt: faker.date.recent({ days: 200 }),
    })
  }
  await insertChunked(
    schema.messageThreads,
    threadRows.map(({ authorId: _a, ...t }) => t),
  )

  const messageRows: (typeof schema.messages.$inferInsert)[] = []
  for (const t of threadRows) {
    // A coherent script in the post's language; messages alternate initiator → author
    const script = pick(conversationScripts[postLang.get(t.postId)!])
    const msgCount = randInt(2, script.length)
    const start = (t.createdAt as Date).getTime()
    for (let m = 0; m < msgCount; m++) {
      const senderId = m % 2 === 0 ? t.initiatorId : t.authorId
      const createdAt = new Date(start + m * randInt(1, 48) * 3600 * 1000)
      // Older messages mostly read; latest may be unread
      const read = m < msgCount - 1 || chance(0.5)
      messageRows.push({
        senderId,
        threadId: t.threadId,
        content: script[m]!,
        createdAt,
        readAt: read ? new Date(createdAt.getTime() + randInt(1, 120) * 60 * 1000) : null,
      })
    }
  }
  await insertChunked(schema.messages, messageRows)

  // ── Harmful content + reports ──
  // Every report points at a real piece of harmful behaviour with a matching
  // category and a meaningful description. All harmful content is English and is
  // attached to English authors/posts so language stays consistent there too.
  console.log('  Generating harmful content & reports...')
  const reportCats = await db.select().from(schema.reportCategories)
  const reportCatId = new Map(reportCats.map((c) => [`${c.targetType}:${c.value}`, c.categoryId]))
  const statusOf = () =>
    weighted<'PENDING' | 'RESOLVED' | 'DISMISSED'>([
      ['PENDING', 60],
      ['RESOLVED', 25],
      ['DISMISSED', 15],
    ])
  const enProfiles = profilesByLang.en
  const reportRows: (typeof schema.reports.$inferInsert)[] = []

  // 1) Harmful posts — inserted as real, visible posts, then reported.
  const harmfulPostRows: (PostRow & { postId: string })[] = []
  const harmfulPostCatRows: { postId: string; categoryId: string }[] = []
  const POST_COPIES = 5
  for (let c = 0; c < POST_COPIES; c++) {
    for (const h of harmfulPosts) {
      const authorId = pick(enProfiles)
      const postId = crypto.randomUUID()
      harmfulPostRows.push({
        postId,
        authorId,
        locationId: chance(0.6) ? pick(insertedLocations).locationId : null,
        postTitle: h.title,
        description: h.body,
        postType: chance(0.7) ? 'OFFER' : 'REQUEST',
        price: chance(0.5) ? `${randInt(20, 500)}.00` : null,
        rateType: 'FIXED',
        createdAt: faker.date.recent({ days: 90 }),
      })
      harmfulPostCatRows.push({ postId, categoryId: pick(categoryIds) })
      // 1–3 distinct reporters flag it
      const reporters = faker.helpers.arrayElements(enProfiles.filter((p) => p !== authorId), randInt(1, 3))
      for (const reporterId of reporters) {
        reportRows.push({
          reporterId,
          postId,
          categoryId: reportCatId.get(`POST:${h.category}`)!,
          description: h.report,
          status: statusOf(),
          createdAt: faker.date.recent({ days: 80 }),
        })
      }
    }
  }
  await insertChunked(schema.posts, harmfulPostRows)
  await insertChunked(schema.postCategories, harmfulPostCatRows)

  // 2) Harmful message threads — a short English exchange where one message is
  //    abusive/scammy/etc. We insert the messages with returning() so the report
  //    can reference the exact offending message id.
  const harmfulThreadRows: (typeof schema.messageThreads.$inferInsert & { threadId: string })[] = []
  const harmfulMsgRows: (typeof schema.messages.$inferInsert)[] = []
  // Parallel metadata: for the reported messages, who reports and with what text.
  const harmfulMsgMeta: ({ reporterId: string; categoryValue: string; report: string } | null)[] = []
  const THREAD_COPIES = 6
  for (let c = 0; c < THREAD_COPIES; c++) {
    for (const h of harmfulThreads) {
      const post = pick(activeEnglishPosts)
      const authorId = post.authorId
      const initiatorId = pick(enProfiles.filter((p) => p !== authorId))
      const key = `${post.postId}:${initiatorId}`
      if (threadKeys.has(key)) continue
      threadKeys.add(key)
      const threadId = crypto.randomUUID()
      const start = faker.date.recent({ days: 90 }).getTime()
      harmfulThreadRows.push({
        threadId,
        postId: post.postId,
        initiatorId,
        createdAt: new Date(start),
      })
      h.messages.forEach((m, idx) => {
        const senderId = m.from === 'initiator' ? initiatorId : authorId
        harmfulMsgRows.push({
          senderId,
          threadId,
          content: m.text,
          createdAt: new Date(start + idx * randInt(1, 24) * 3600 * 1000),
          readAt: idx < h.messages.length - 1 ? new Date(start + idx * 3600 * 1000 + 600000) : null,
        })
        // The reporter is the participant who did NOT send the offending message
        if (idx === h.reportIndex) {
          const reporterId = m.from === 'initiator' ? authorId : initiatorId
          harmfulMsgMeta.push({ reporterId, categoryValue: h.category, report: h.report })
        } else {
          harmfulMsgMeta.push(null)
        }
      })
    }
  }
  await insertChunked(schema.messageThreads, harmfulThreadRows)
  const insertedHarmfulMsgs = await db.insert(schema.messages).values(harmfulMsgRows).returning({
    messageId: schema.messages.messageId,
  })
  insertedHarmfulMsgs.forEach((row, idx) => {
    const meta = harmfulMsgMeta[idx]
    if (!meta) return
    reportRows.push({
      reporterId: meta.reporterId,
      messageId: row.messageId,
      categoryId: reportCatId.get(`MESSAGE:${meta.categoryValue}`)!,
      description: meta.report,
      status: statusOf(),
      createdAt: faker.date.recent({ days: 70 }),
    })
  })

  // 3) Harmful reviews — fake/spam/abusive reviews on English posts, then reported.
  const harmfulReviewRows: (typeof schema.reviews.$inferInsert)[] = []
  const harmfulReviewMeta: { reporterId: string; categoryValue: string; report: string }[] = []
  const REVIEW_COPIES = 6
  for (let c = 0; c < REVIEW_COPIES; c++) {
    for (const h of harmfulReviews) {
      const post = pick(activeEnglishPosts)
      const reviewerId = pick(enProfiles.filter((p) => p !== post.authorId))
      harmfulReviewRows.push({
        reviewerId,
        postId: post.postId,
        rating: h.rating,
        reviewDescription: h.text,
        createdAt: faker.date.recent({ days: 80 }),
      })
      // Reported by the post's author (the one harmed by the fake/abusive review)
      harmfulReviewMeta.push({ reporterId: post.authorId, categoryValue: h.category, report: h.report })
    }
  }
  const insertedHarmfulReviews = await db.insert(schema.reviews).values(harmfulReviewRows).returning({
    reviewId: schema.reviews.reviewId,
  })
  insertedHarmfulReviews.forEach((row, idx) => {
    const meta = harmfulReviewMeta[idx]!
    reportRows.push({
      reporterId: meta.reporterId,
      reviewId: row.reviewId,
      categoryId: reportCatId.get(`REVIEW:${meta.categoryValue}`)!,
      description: meta.report,
      status: statusOf(),
      createdAt: faker.date.recent({ days: 60 }),
    })
  })

  await insertChunked(schema.reports, reportRows)

  // ── Summary ──
  console.log('\n✅ Seed complete:')
  console.log(`   ${permissionDefinitions.length} permissions, 4 roles (User, Moderator, Admin, SuperAdmin)`)
  console.log(`   ${userRows.length} accounts (${bannedCount} banned), ${profileRows.length} profiles`)
  console.log(`   ${categoryDefs.length} categories`)
  console.log(
    `   ${postRows.length + harmfulPostRows.length} posts (incl. ${harmfulPostRows.length} flagged) across EN/CS/SK`,
  )
  console.log(`   ${favRows.length} favourites, ${reviewRows.length + insertedHarmfulReviews.length} reviews`)
  console.log(
    `   ${threadRows.length + harmfulThreadRows.length} threads, ${messageRows.length + insertedHarmfulMsgs.length} messages`,
  )
  console.log(`   ${reportRows.length} reports (post / message / review, all real harmful content)`)
  console.log(`   Images: ${imagePool.avatars.length} avatars + ${imagePool.posts.length} post photos hosted on MinIO`)
  console.log('\n🔑 Demo logins (password unless noted):')
  for (const d of demoAccounts) {
    console.log(`   ${d.roleName.padEnd(11)} ${d.email}  (${d.password})${d.emailVerified ? '' : '  [unverified]'}`)
  }

  await client.end()
  await redis.quit()
}

// Signup/email side-effects can reject detached from the promise chain; mirror
// the server's guard so expected failures don't crash the seed.
process.on('unhandledRejection', (reason) => {
  console.warn('[seed] ignoring unhandled rejection:', reason)
})

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
