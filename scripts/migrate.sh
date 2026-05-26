#!/bin/sh
# Run once manually before or after deploy — do NOT include in the container start command.
# Usage:
#   Local:   sh scripts/migrate.sh
#   Railway: railway run sh scripts/migrate.sh
set -e
export PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1
echo "Running prisma migrate deploy..."
pnpm --filter api exec npx prisma migrate deploy
echo "Migration complete."
