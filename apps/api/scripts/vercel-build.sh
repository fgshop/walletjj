#!/bin/bash
set -e

echo "=== Build starting ==="
echo "PWD: $(pwd)"
echo "Contents: $(ls -la)"
echo "Node: $(node --version)"

# Build shared packages first
pnpm --filter @joju/types build
pnpm --filter @joju/utils build

# Generate Prisma client from apps/api
cd apps/api
npx prisma generate

# Copy generated .prisma/client everywhere it's needed
mkdir -p ../../node_modules/.prisma
cp -r node_modules/.prisma/client ../../node_modules/.prisma/

# Overwrite default .prisma/client in pnpm virtual store
for dir in $(find ../../node_modules/.pnpm -path "*/.prisma/client" -type d 2>/dev/null); do
  echo "Copying Prisma to: $dir"
  cp -r node_modules/.prisma/client/* "$dir/" 2>/dev/null || true
done

# Compile TypeScript (noCheck to bypass Prisma type hoisting issues)
rm -rf dist
npx tsc -p tsconfig.vercel.json

echo "=== Build completed ==="
