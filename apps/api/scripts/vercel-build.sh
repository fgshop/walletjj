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

# Copy generated .prisma/client to root node_modules so @prisma/client can resolve it
mkdir -p ../../node_modules/.prisma
cp -r node_modules/.prisma/client ../../node_modules/.prisma/

# Compile TypeScript without type checking (Prisma types hoisting issue on Vercel)
rm -rf dist
npx tsc -p tsconfig.vercel.json

echo "Build completed successfully"
