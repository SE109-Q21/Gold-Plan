import { defineConfig } from 'prisma/config'

// DIRECT_URL = non-pooler Neon URL, required for prisma migrate deploy
// (Neon's pooler/PgBouncer does not support pg_advisory_lock used by Prisma Migrate)
// DATABASE_URL = pooler URL, used by the runtime app via @prisma/adapter-pg
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
})
