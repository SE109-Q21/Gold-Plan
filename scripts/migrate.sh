#!/bin/sh
# Retries prisma migrate deploy up to 5 times with backoff.
# Pre-warms Neon's serverless compute so pg_advisory_lock succeeds
# within Prisma's 10 s lock_timeout on cold starts.
set -e
MAX=5
n=0

echo "Warming up database connection..."
node -e 'const {Pool}=require("pg");const p=new Pool({connectionString:process.env.DIRECT_URL||process.env.DATABASE_URL,max:1,connectionTimeoutMillis:30000});p.query("SELECT 1").then(()=>{console.log("DB warm");p.end();}).catch(e=>{console.log("warm-up skipped:",e.message);p.end();});' || true

until [ $n -ge $MAX ]; do
  PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1 pnpm --filter api exec npx prisma migrate deploy && exit 0
  n=$((n + 1))
  echo "migrate attempt $n/$MAX failed — waiting 10s before retry..."
  sleep 10
done
echo "All $MAX migration attempts failed"
exit 1
