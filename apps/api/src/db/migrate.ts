/**
 * Standalone migration runner for production / container startup.
 *
 * Uses drizzle-orm's programmatic migrator (drizzle-orm + postgres, both
 * production dependencies) so the runtime image does NOT need the drizzle-kit
 * CLI. Applies every SQL file in ../../drizzle in journal order, then exits.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required to run migrations')

// Resolve ./drizzle relative to this file, not the current working directory.
const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle')

const sql = postgres(databaseUrl, { max: 1 })

console.log(`[migrate] applying migrations from ${migrationsFolder}`)
await migrate(drizzle(sql), { migrationsFolder })
await sql.end()
console.log('[migrate] done')
