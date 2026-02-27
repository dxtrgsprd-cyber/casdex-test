# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config and all package.json files for dependency caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ─────────────────────────────────────────────────
FROM base AS builder

# Copy all source code
COPY apps/api/ apps/api/
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY packages/auth/ packages/auth/

# Generate Prisma client
RUN pnpm --filter @casdex/db generate

# Build shared packages first, then API
RUN pnpm --filter @casdex/shared build
RUN pnpm --filter @casdex/auth build
RUN pnpm --filter @casdex/db build
RUN pnpm --filter @casdex/api build

# ── Stage 3: Production image ──────────────────────────────────────
FROM base AS runner

# Copy Prisma schema + migrations + seed script for runtime
COPY --from=builder /app/packages/db/prisma/ packages/db/prisma/

# Generate Prisma client with the actual schema
RUN pnpm --filter @casdex/db exec prisma generate

# Copy built output for each workspace
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/packages/db/dist/ packages/db/dist/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/auth/dist/ packages/auth/dist/

ENV NODE_ENV=production

EXPOSE 4000

# Run migrations, seed database, then start the API
CMD pnpm --filter @casdex/db exec prisma migrate deploy && \
    pnpm --filter @casdex/db exec tsx prisma/seed.ts && \
    node apps/api/dist/main.js
