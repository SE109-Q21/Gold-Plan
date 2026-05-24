#!/bin/sh
# Retries prisma migrate deploy up to 5 times with backoff.
# Needed because Neon free-tier cold-starts can exceed Prisma's 10s
# advisory-lock timeout on the first connection attempt.
set -e
MAX=5
n=0
until [ $n -ge $MAX ]; do
  pnpm --filter api exec npx prisma migrate deploy && exit 0
  n=$((n + 1))
  echo "migrate attempt $n/$MAX failed — waiting 10s before retry..."
  sleep 10
done
echo "All $MAX migration attempts failed"
exit 1
