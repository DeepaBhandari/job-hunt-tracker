#!/bin/sh
set -e

echo "[api] running database migrations..."
packages/db/node_modules/.bin/prisma migrate deploy --schema=packages/db/prisma/schema.prisma

echo "[api] starting server..."
exec node apps/api/dist/index.js
