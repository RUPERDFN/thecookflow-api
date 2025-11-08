#!/usr/bin/env bash
set -euo pipefail
# Descomenta si usas Drizzle/Prisma:
# npx drizzle-kit push || true
# npx prisma migrate deploy || true
node dist/server.js
