import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Only set datasource when DATABASE_URL is present (migrate/deploy time).
  // During `prisma generate` (build time) the URL is not needed.
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
})
