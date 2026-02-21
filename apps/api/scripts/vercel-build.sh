#!/bin/bash
set -e

# This script runs from apps/api/ (Vercel Root Directory = apps/api)
# Go to repo root for shared package builds
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

# Overwrite default .prisma/client in pnpm virtual store so @prisma/client
# finds the generated client instead of the default/uninitialized stub
find ../../node_modules/.pnpm -path "*/.prisma/client" -type d 2>/dev/null | while read -r dir; do
  echo "Patching Prisma client at: $dir"
  cp -r node_modules/.prisma/client/* "$dir/" 2>/dev/null || true
done

# Compile TypeScript (noCheck to bypass Prisma type hoisting issues)
rm -rf dist
npx tsc -p tsconfig.vercel.json

echo "Build completed successfully"
