#!/bin/bash
set -e

# Build from repo root
cd ../..

# Build shared packages
pnpm --filter @joju/types build
pnpm --filter @joju/utils build

# Generate Prisma client
cd apps/api
npx prisma generate

# Copy generated .prisma/client to root node_modules
mkdir -p ../../node_modules/.prisma
cp -r node_modules/.prisma/client ../../node_modules/.prisma/

# Also overwrite the default .prisma/client in pnpm virtual store
# (pnpm hoists @prisma/client into .pnpm store with a default/uninitialized .prisma/client)
PRISMA_STORE_DIRS=$(find ../../node_modules/.pnpm -path "*/.prisma/client" -type d 2>/dev/null || true)
if [ -n "$PRISMA_STORE_DIRS" ]; then
  echo "$PRISMA_STORE_DIRS" | while read -r dir; do
    echo "Copying generated Prisma client to: $dir"
    cp -r node_modules/.prisma/client/* "$dir/"
  done
fi

# Compile TypeScript without type checking (Prisma types hoisting issue on Vercel)
rm -rf dist
npx tsc -p tsconfig.vercel.json

echo "Build completed successfully"
