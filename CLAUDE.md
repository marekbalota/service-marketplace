# Marketplace for Services — CLAUDE.md

A service marketplace where users post offers or requests for services (e.g. tutoring, plumbing, design). Posts include a title, description, price, and contact details, and are organised by category. Users can rate each other through reviews.

## Tech Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| Frontend      | React 19, TanStack Start (SPA mode), Tailwind CSS v4, Shadcn/UI |
| Backend       | ElysiaJS                                                        |
| ORM           | Drizzle ORM                                                     |
| Database      | PostgreSQL 17                                                   |
| Runtime       | Bun                                                             |
| Data Fetching | TanStack Query v5                                               |
| Validation    | Zod v4                                                          |
| Testing       | Vitest, Testing Library                                         |

## Project Structure

```
pb138-marketplace_for_services/
├── apps/
│   ├── api/                      # ElysiaJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts      # Drizzle singleton (import `db` from here)
│   │   │   │   ├── schema.ts     # All Drizzle table + relation definitions
│   │   │   │   └── seed.ts       # Upsert-based seed script
│   │   │   ├── routes/           # One file per resource (posts.ts, categories.ts, …)
│   │   │   ├── logger.ts         # Elysia logger plugin — request + error logging
│   │   │   └── index.ts          # Server entry point — registers plugins, CORS, Swagger
│   │   └── drizzle/              # Generated SQL migrations
│   └── web/                      # TanStack Start frontend (port 3000)
│       └── src/
│           ├── routes/           # File-based routes (TanStack Router)
│           ├── components/       # Shared UI components
│           │   └── ui/           # Shadcn/UI primitives
│           ├── api.ts            # Eden Treaty typed client (import as `api`)
│           ├── router.tsx        # Router factory + exported `queryClient`
│           └── styles.css        # Global styles + Tailwind theme tokens
├── docs/                         # Non-code project resources
│   ├── erd.puml                  # Entity-relationship diagram (source of truth for schema)
│   ├── screen-flow.puml          # Screen navigation flow diagram
│   └── requirements.md           # Full functional and non-functional requirements
├── docker-compose.yml            # PostgreSQL 17 container
└── package.json                  # Workspace root
```

## Database Schema

Schema is defined in `apps/api/src/db/schema.ts`. The ERD (`docs/erd.puml`) is the source of truth.

- All primary keys are UUIDs with `defaultRandom()`.
- Soft deletes via `deleted_at timestamp` on every table — never hard-delete rows.
- `post_type` enum: `REQUEST | OFFER`
- `rate_type` enum: `HOURLY | DAILY | FIXED`
- `reviews.rating` is constrained to values 1–5.
- Junction tables (`role_permissions`, `post_categories`, `post_locations`, `favourites`) use composite primary keys.

## Internationalisation (i18n)

Supports EN/SK/CS via react-i18next. Always use `useTranslation()` + `t('key')` for UI strings — never hardcode English. Keys are type-safe (`src/i18next.d.ts`); translations live in `src/translations/{en,sk,cs}.json` — add new keys to all three. Zod validation errors are translated globally via `src/lib/zodErrorMap.ts` — use `.min(3)` not `.min(3, 'message')`. Do not translate user-generated content or database-driven content (categories).

## Code Conventions

- All TypeScript — no `any` unless unavoidable.
- Soft-delete pattern: set `deleted_at` rather than deleting rows.
- Backend routes live in `apps/api/src/routes/` — one file per resource, registered as Elysia plugins in `index.ts`.
- Frontend routes are file-based under `apps/web/src/routes/` (TanStack Router convention).
- Use Shadcn/UI components for all UI elements; extend with Tailwind v4 utility classes.
- To add a new Shadcn component: `bunx --bun shadcn@latest add <name>`
- **Forms use React Hook Form + Zod**: `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onTouched' })`. `onTouched` validates on blur first, then on change after — better UX than `onChange` (no errors while typing) while still giving immediate feedback when correcting. Wrap fields with `Field / FieldGroup / FieldLabel / FieldError` from `components/ui/field`. Use `Controller`'s `render={({ field, fieldState }) => ...}` pattern for all inputs — required for custom controls like `Select` that don't support `register`. Set `data-invalid={fieldState.invalid}` and `aria-invalid={fieldState.invalid}` on the `Field` and input respectively. For `Select` and other custom controls, call both `field.onChange(v)` and `field.onBlur()` in `onValueChange` so the field is marked touched. Always render `<FieldError errors={[fieldState.error]} />` unconditionally — the component self-nulls when there is no error, so no guard (`fieldState.invalid &&`) is needed. Type the submit handler as `SubmitHandler<FormValues>` from `react-hook-form`.
- **Always write tests alongside new code** — no route handler, component, or non-trivial pure function ships without a test.
  - API route handler → `bun:test` integration test in the same `routes/` directory (see `backend-conventions` skill).
  - React component or pure function → Vitest unit test next to the source file (see `frontend-patterns` skill).
  - New user-facing feature → add or extend an e2e scenario in `e2e/marketplace.spec.ts`.
- Run tests: `bun run test` (unit, all workspaces) · `bun run test:e2e` (Playwright, requires DB + both dev servers).
- Logging: log to stdout/stderr only — never to files. Works universally across all deployment targets (Kubernetes, Docker, PaaS). The logger plugin (`apps/api/src/logger.ts`) logs all requests (stdout) and errors (stderr) via Elysia lifecycle hooks; `process.on('unhandledRejection')` in `index.ts` catches anything outside the request lifecycle.
- **File Organisation — routes and queries:**
  - Shared query options live in `lib/queries/<resource>.ts` (e.g. `users.ts`, `profiles.ts`, `posts.ts`, `admin.ts`). A query option belongs here when it is used by two or more routes, OR when the same query key appears in two or more files (split-cache risk).
  - Route-specific query options live in `<route>/-queries/<name>.ts`. The `-` prefix excludes the folder from TanStack Router's route generation.
  - Route-specific components live in `<route>/-components/`. Components reused across routes live in `components/`.
  - When a route needs a `-components/` folder, convert `routename.tsx` to `routename/route.tsx` (TanStack Router treats them identically at runtime). Use `route.tsx` for standalone routes; `index.tsx` signals an index child of a layout route.
  - Skeletons used across multiple routes live in `components/`; skeletons used only in one route are inline functions in the route file.
  - Tests follow their source file: `Foo.tsx` → `Foo.test.tsx` in the same directory.
  - See the `frontend-patterns` skill for full detail and examples.
