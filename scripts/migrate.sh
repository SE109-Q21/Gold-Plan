#!/bin/sh
# Retries prisma migrate deploy up to 5 times with backoff.
# PRISMA_MIGRATE_SKIP_ADVISORY_LOCK bypasses pg_advisory_lock — safe
# because Railway deploys are serialized (no concurrent migrations).
set -e
MAX=5
n=0
until [ $n -ge $MAX ]; do
  PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1 pnpm --filter api exec npx prisma migrate deploy && exit 0
  n=$((n + 1))
  echo "migrate attempt $n/$MAX failed — waiting 10s before retry..."
  sleep 10
done
echo "All $MAX migration attempts failed"
exit 1
