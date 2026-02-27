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
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy built output and package.json for each workspace
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/db/dist/ packages/db/dist/
COPY --from=builder /app/packages/db/package.json packages/db/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/auth/dist/ packages/auth/dist/
COPY --from=builder /app/packages/auth/package.json packages/auth/

# Copy Prisma schema + migrations + seed script for runtime
COPY --from=builder /app/packages/db/prisma/ packages/db/prisma/

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/  node_modules/.pnpm/@prisma+client*/
COPY --from=builder /app/node_modules/@prisma/ node_modules/@prisma/
COPY --from=builder /app/node_modules/prisma/ node_modules/prisma/

# Copy all node_modules from builder (need tsx, bcryptjs for seed script)
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/db/node_modules/ packages/db/node_modules/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production

EXPOSE 4000

# Run migrations, seed database, then start the API
CMD npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && \
    npx tsx packages/db/prisma/seed.ts && \
    node apps/api/dist/main.js
