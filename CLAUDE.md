# CASDEX Platform

Multi-tenant security integration project lifecycle management platform.

## Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM with Row-Level Security
- **Auth**: Custom JWT + bcrypt (no Cognito)
- **State Management**: Zustand

## Project Structure

```
apps/web          — Next.js main platform UI
apps/api          — NestJS backend API
apps/field        — PWA for field tech / subcontractor (future)
apps/customer-portal — Customer portal (future)
packages/shared   — Shared types, constants
packages/db       — Prisma schema, migrations, seed
packages/auth     — Auth utilities
packages/documents — Document generation (future)
packages/risk-engine — Risk scoring (future)
packages/compliance  — Door/fire compliance (future)
packages/device-library — Manufacturer device data (future)
```

## Key Principles

1. **Scope thoroughly → list changes → get approval → then code.**
2. **Read existing code before writing anything.** Diagnose first, then fix.
3. **Don't auto-add features, devices, lists without asking.** Don't assume.
4. **Never guess.** Guessing wastes time and costs money.
5. **User is not a programmer.** Explain everything in plain English.
6. **No emojis anywhere in the platform UI. Ever. No exceptions.**
7. **Every DB query must include tenant_id** — enforced by RLS and middleware.

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed default data
```

## Multi-Tenancy

Every table has a `tenant_id`. The JWT token contains `tenantId` and `roles`.
The API middleware extracts this from the token and scopes all queries accordingly.
A user can belong to multiple tenants with different roles in each.
