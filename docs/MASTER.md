# CASDEX Platform -- Master Reference Document

Last updated: 2026-02-28

---

## 1. Platform Overview

CASDEX is a multi-tenant security integration project lifecycle management platform. It supports the full workflow from opportunity/lead intake through survey, system design, project execution, and close-out -- built for commercial security integrators managing cameras, access control, networking, and related systems. Each tenant (organization) operates in complete isolation with its own users, roles, opportunities, and data.

---

## 2. Current State Summary

### What is built and working

- Custom JWT authentication with multi-tenant context, refresh token rotation, password reset/recovery, and invite flows
- Full user management with role-based access control and permission guards
- Opportunity lifecycle from lead through close-out (OPP-XXXXX numbering, status tracking, team assignment, approvals)
- Global admin portal for managing tenants, users, and roles across organizations
- Dashboard with metrics, calendar events, risk alerts, vendors, documents, and unassigned opportunities
- Notifications system (list, count unread, mark read)
- Role and permission management per tenant (module + action matrix)
- PostgreSQL database with 30+ models covering the full project lifecycle
- Docker-based deployment for API (Railway) and frontend (Vercel)
- Docker Compose for local development (PostgreSQL + Redis)

### What is scaffolded but not yet functional

- Projects list page (UI exists, backend endpoints not yet built)
- Survey page (UI placeholder, PWA-ready model)
- Design page (canvas framework, no visualization)
- Vendors management page (UI placeholder)
- Subcontractors management page (UI placeholder)
- Tools page (placeholder)
- Management page (placeholder)

### What is not yet implemented

- Email sending (password reset links, notifications)
- S3 file storage (env vars configured, not integrated)
- Redis integration (caching, rate limiting)
- Row-Level Security (RLS) enforcement at DB level
- PWA offline sync for field operations
- Design canvas visualization and device placement UI
- Risk scoring calculation engine
- Document generation (proposals, SOWs, etc.)
- Full IKOM/CKOM workflow UI
- Change order PDF export
- QC checklist templates
- Daily report photo upload
- Push notifications
- Field tech PWA app (`apps/field`)
- Customer portal (`apps/customer-portal`)

---

## 3. Architecture and Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Workspace filtering with `--filter` |
| Frontend | Next.js 14.2 (App Router) + React 18.3 + TypeScript 5.7 | Tailwind CSS 3.4 for styling |
| Backend | NestJS 10.4 + TypeScript | Passport.js for auth strategy |
| Database | PostgreSQL 16 + Prisma 6.2 ORM | Docker Compose for local dev |
| Auth | Custom JWT + bcryptjs | Two-token system (access + refresh) |
| State | Zustand 5 | Persisted to localStorage |
| Cache | Redis 7 (planned) | Docker Compose configured, not yet used |
| Dev tooling | Turbo 2.3, pnpm 9.15 | Root-level orchestration |

---

## 4. Project Structure

```
apps/
  api/                 NestJS backend (port 4000)
  web/                 Next.js frontend (port 3000)
  field/               PWA for field techs (future)
  customer-portal/     Customer portal (future)

packages/
  db/                  Prisma schema, migrations, seed
  shared/              Shared types, constants
  auth/                Auth utilities (shared between apps)
  documents/           Document generation (future)
  risk-engine/         Risk scoring (future)
  compliance/          Door/fire compliance (future)
  device-library/      Manufacturer device data (future)
```

---

## 5. Database Schema

30+ Prisma models. Every table includes `tenant_id` for multi-tenancy. All IDs use CUID. Timestamps (`createdAt`, `updatedAt`) on all tables.

### Multi-tenancy and Auth

| Model | Table | Purpose |
|---|---|---|
| Tenant | `tenants` | Organizations with slug, settings (JSON), active flag |
| User | `users` | Global user records (email unique), `isGlobalAdmin` flag |
| UserTenant | `user_tenants` | Join table: user + tenant + role. Unique on `(userId, tenantId)` |
| Role | `roles` | Per-tenant roles (admin, manager, sales, etc.). Unique on `(tenantId, name)` |
| RolePermission | `role_permissions` | Module + action matrix (e.g. `opportunities.create`). Unique on `(roleId, module, action)` |
| RefreshToken | `refresh_tokens` | Stored refresh tokens for rotation. Indexed on `userId` |
| PasswordReset | `password_resets` | Reset/invite tokens with expiry and used-at tracking |

### Opportunities Lifecycle

| Model | Table | Purpose |
|---|---|---|
| Opportunity | `opportunities` | Main record: OPP-XXXXX number, status, customer info, project details. Unique on `(tenantId, oppNumber)` |
| OppTeamMember | `opp_team_members` | Team assigned to opp (isr, osr, presales_architect, etc.). Unique on `(oppId, userId, role)` |
| OppStatusHistory | `opp_status_history` | Audit trail of status changes with reason |
| Approval | `approvals` | Approval requests (quote, delete, customer, project) with pending/approved/declined status |

### Surveys and Designs

| Model | Table | Purpose |
|---|---|---|
| Survey | `surveys` | Field surveys with scheduling, status tracking, offline sync support |
| SurveyPhoto | `survey_photos` | Photos uploaded during surveys with location/caption |
| Design | `designs` | Camera/system design canvas with version control. Canvas state stored as JSON |
| PlacedDevice | `placed_devices` | Devices placed on design canvas with position, rotation, FOV |

### Projects

| Model | Table | Purpose |
|---|---|---|
| Project | `projects` | OPP-to-Project transition (PN-XXXXX). IKOM/CKOM dates, PM assignment. Unique on `(tenantId, projectNumber)` |
| ProjectAssignment | `project_assignments` | Team members assigned to project (field_technician, subcontractor) |
| ProjectTask | `project_tasks` | Task checklist per project with priority and status |
| MaterialOrder | `material_orders` | BOM tracking (vendor, status, delivery dates) |
| ChangeOrder | `change_orders` | CO-XXX tracking with multi-step approval workflow |
| DailyReport | `daily_reports` | Field tech daily logs (hours, tasks, issues, photos). Offline sync support |
| QcCheck | `qc_checks` | Quality control checklists (camera install, door hardware, etc.) as JSON |

### Supporting Data

| Model | Table | Purpose |
|---|---|---|
| Document | `documents` | File storage metadata (type, signed status, version) |
| RiskAssessment | `risk_assessments` | Risk scoring at preliminary and PM stages (9 score types, overall score, risk level) |
| Vendor | `vendors` | Equipment vendors by category (cameras, access_control, networking, etc.) |
| Subcontractor | `subcontractors` | Service providers with trades (JSON), territories (JSON), insurance expiry |
| Device | `devices` | Manufacturer device specs (part number unique). Hanwha, AXIS, Verkada, etc. |
| TenantDevice | `tenant_devices` | Per-tenant device availability and pricing overrides. Unique on `(tenantId, deviceId)` |
| PerformanceScore | `performance_scores` | KPI tracking by category and period |
| Notification | `notifications` | User notifications with read status |
| AuditLog | `audit_logs` | Compliance audit trail. Indexed on `(tenantId, entity, createdAt)` and `(userId, createdAt)` |

---

## 6. API Endpoints

All endpoints require Bearer token authentication (JWT) except those marked Public. Tenant scoping is applied via middleware on every request.

### Auth (Public)

```
POST   /api/auth/login                        Login with optional tenantId
POST   /api/auth/refresh                      Refresh access token
POST   /api/auth/set-password                 Set initial password (invite flow)
POST   /api/auth/reset-password/request       Request password reset email
POST   /api/auth/reset-password               Reset password with token
POST   /api/auth/change-password              Change password (authenticated)
POST   /api/auth/switch-tenant                Switch between user's tenants
POST   /api/auth/logout                       Invalidate refresh tokens
```

### Users

```
GET    /api/users/me                          Get own profile
PUT    /api/users/me                          Update own profile
GET    /api/users                             List tenant users (paginated, searchable)
GET    /api/users/:id                         Get user detail
POST   /api/users                             Create user with role assignment
PUT    /api/users/:id                         Update user
PUT    /api/users/:id/role                    Change user role
DELETE /api/users/:id                         Delete user
POST   /api/users/by-tenant/:tenantId         List users in specific tenant
```

### Roles

```
GET    /api/roles                             List roles in current tenant
GET    /api/roles/:id                         Get role with permissions
POST   /api/roles                             Create role
PUT    /api/roles/:id                         Update role
DELETE /api/roles/:id                         Delete role
```

### Opportunities

```
GET    /api/opportunities/metrics             Metrics dashboard (totals, by-status)
GET    /api/opportunities                     List with filters (status, territory, search, pagination)
GET    /api/opportunities/:id                 Get with full relations
POST   /api/opportunities                     Create (auto-generates OPP-XXXXX)
PUT    /api/opportunities/:id                 Update
PUT    /api/opportunities/:id/status          Change status (tracked in history)
POST   /api/opportunities/:id/team            Add team member
DELETE /api/opportunities/:id/team/:memberId  Remove team member
POST   /api/opportunities/:id/project-number  Assign PN-XXXXX (transitions to Project)
POST   /api/opportunities/:id/approvals       Request approval
PUT    /api/opportunities/:id/approvals/:id   Resolve approval (approve/decline)
DELETE /api/opportunities/:id                 Delete
```

### Notifications

```
GET    /api/notifications                     List user notifications
GET    /api/notifications/count               Count unread
PUT    /api/notifications/:id/read            Mark single read
PUT    /api/notifications/read-all            Mark all read
```

### Dashboard

```
GET    /api/dashboard                         Metrics, calendar, risk alerts, vendors, documents, unassigned opps
```

### Tenants (Global Admin only)

```
GET    /api/tenants                           List all tenants
GET    /api/tenants/:id                       Get tenant
POST   /api/tenants                           Create tenant
PUT    /api/tenants/:id                       Update tenant
DELETE /api/tenants/:id                       Delete tenant
GET    /api/tenants/current/roles             List roles in current tenant
```

---

## 7. Frontend Pages and Components

### Route Structure

```
src/app/
  (dashboard)/                       Main app with sidebar layout
    page.tsx                         Dashboard home
    opportunities/
      page.tsx                       Opportunities list
      [id]/page.tsx                  Opportunity detail
    projects/page.tsx                Projects list
    survey/page.tsx                  Survey (PWA ready)
    design/page.tsx                  Design canvas
    vendors/page.tsx                 Vendors management
    subcontractors/page.tsx          Subcontractors management
    management/page.tsx              Internal admin functions
    tools/page.tsx                   Tools
  (admin)/                           Global admin portal (isolated)
    admin/
      page.tsx                       Admin dashboard (org stats)
      tenants/
        page.tsx                     List organizations
        new/page.tsx                 Create organization
        [id]/page.tsx                Edit org (tabbed: General/Users/Roles)
      users/page.tsx                 Global user management
  login/page.tsx                     Auth page
  reset-password/page.tsx            Password reset request
  set-password/page.tsx              Invite password setup
```

### Key Components

| Component | Purpose |
|---|---|
| AdminGuard | Protects /admin routes, redirects non-global-admins to login |
| AdminNav | Dark header nav for admin portal with "CASDEX Admin" branding |
| TopNav | Regular app nav with user menu and global admin portal link |
| DashboardLayout | Main app layout (sidebar + content area) |
| AdminLayout | Admin portal layout (dark theme, isolated from regular app) |

### Dashboard Widgets

| Widget | Description |
|---|---|
| StatCard | Metric with colored accent bar (Tabler-style) |
| CalendarWidget | List/month view with color-coded events |
| RiskWidget | Elevated risk items with severity badges |
| VendorWidget | Recent vendors with category and contact |
| SubcontractorWidget | Active subcontractors with trades |
| DocumentWidget | Recent documents with signing status |
| UnassignedOppsTable | Opportunities awaiting project number assignment |

---

## 8. Authentication Flow

### Architecture

- Custom JWT + bcryptjs (no Cognito or third-party auth)
- Two-token system: access token (JWT, 15-minute default expiry) + refresh token (UUID, stored in DB)
- Token rotation: refresh token is deleted after use, new pair issued
- Multi-tenant context embedded in JWT payload

### JWT Payload

```json
{
  "sub": "userId",
  "email": "user@example.com",
  "tenantId": "selectedTenantId",
  "roles": ["manager", "presales"],
  "isGlobalAdmin": false
}
```

### User Journey

1. **Login** -- Email + password on `/login`. Backend validates hash, returns access token, refresh token, user data, available tenants list. Frontend stores in Zustand (persisted to localStorage). Global admins redirect to `/admin`.

2. **Token Refresh** -- On app load, frontend tries refresh if access token is missing or expired. POST `/auth/refresh` with stored refresh token. Backend validates, deletes old token, issues new pair.

3. **Multi-tenant Switch** -- POST `/auth/switch-tenant` returns new tokens with different `tenantId` in JWT payload. Frontend updates auth store.

4. **Password Reset** -- User enters email on `/reset-password`. Backend generates UUID token stored in `password_resets` with 24-hour expiry. User clicks link with token, sets new password. Token marked as used. (Email sending not yet implemented -- logs to console in dev.)

5. **Invite Flow** -- Admin creates user, system generates invite token. User clicks link to `/set-password?token=xxx`, sets password, gains access.

6. **Logout** -- Frontend clears auth store. POST `/auth/logout` deletes all user's refresh tokens.

### Guards

| Guard | Purpose |
|---|---|
| JwtAuthGuard (Passport) | Validates JWT signature, checks user is active |
| RolesGuard | Checks roles array (admin, manager, global_admin) |
| PermissionsGuard | Checks RolePermission matrix (module + action) |
| @Public() decorator | Skips auth for login, reset-password, etc. |

---

## 9. Global Admin Portal

Separate isolated `/admin` route for global admins (NinjaOne-style management console).

### Pages

- `/admin` -- Dashboard with organization statistics and recent orgs table
- `/admin/tenants` -- List all organizations (search, status filter, create button)
- `/admin/tenants/new` -- Create organization form
- `/admin/tenants/[id]` -- Edit organization with 3-tab interface: General (name, slug, active status), Users (list/add/remove), Roles (list/create/edit with permission matrix)
- `/admin/users` -- Global user management

### Access Control

- `AdminGuard` component checks `user.isGlobalAdmin` flag
- Non-global-admins are redirected to login
- Login redirects global admins to `/admin` instead of `/`
- Regular app user menu shows "Admin Portal" link for global admins
- Global admin `tenantId` is `'global'` when not assigned to any specific org

### Design

- Dark top navigation bar, visually distinct from regular app
- "CASDEX Admin" branding in nav
- Completely isolated from regular app UI to prevent confusion
- Uses same auth system but different role context

---

## 10. Deployment

### API (Railway -- Docker)

Multi-stage Dockerfile:
1. Base stage: Install pnpm, copy workspace config
2. Builder stage: Build all packages with Prisma client generation
3. Runner stage: Lean production image

Entrypoint runs migrations, seeds database, then starts NestJS.

### Frontend (Vercel)

- Build command: `cd ../.. && pnpm turbo build --filter=@casdex/web`
- Install command: `cd ../.. && pnpm install`
- Framework: Next.js (auto-detected)

### Local Development (Docker Compose)

- PostgreSQL 16 on port 5432 with persistent volume
- Redis 7 on port 6379 with persistent volume

### CORS Configuration

- `localhost:3000` (dev)
- `FRONTEND_URL` env var (production)
- All `*.vercel.app` domains (preview + production)
- Credentials: enabled

---

## 11. Environment Variables

### Backend (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| DATABASE_URL | `postgresql://postgres:postgres@localhost:5432/casdex?schema=public` | PostgreSQL connection string |
| JWT_SECRET | (required) | Access token signing secret |
| JWT_REFRESH_SECRET | (required) | Refresh token signing secret |
| JWT_EXPIRES_IN | `15m` | Access token expiry |
| JWT_REFRESH_EXPIRES_IN | `7d` | Refresh token expiry |
| PORT | `4000` | API server port |
| FRONTEND_URL | `http://localhost:3000` | Used for CORS and email links |
| S3_BUCKET | (empty) | File storage bucket (not yet used) |
| S3_REGION | (empty) | AWS region (not yet used) |
| S3_ACCESS_KEY | (empty) | AWS access key (not yet used) |
| S3_SECRET_KEY | (empty) | AWS secret key (not yet used) |
| REDIS_URL | `redis://localhost:6379` | Redis connection (not yet used) |

### Frontend

| Variable | Default | Purpose |
|---|---|---|
| NEXT_PUBLIC_API_URL | `http://localhost:4000/api` | Backend API base URL |

---

## 12. Key Architectural Decisions

1. **Multi-tenancy via `tenant_id`** -- Every table has a `tenant_id` column. Enforced at the middleware/service layer. Database-level RLS is planned but not yet active.

2. **No emojis** -- The platform strictly avoids emojis in all UI. This is a hard design constraint.

3. **Tabler-style dashboard** -- Dashboard uses Tabler admin template aesthetic with colored accent bars, card-based metrics, and clean data-dense layouts.

4. **Separate admin portal** -- Global admins have an isolated `/admin` route with its own navigation and dark theme to avoid confusion with the regular app.

5. **Module-action permissions** -- Fine-grained permissions stored in `RolePermission` as a module + action matrix (e.g. `opportunities.create`, `survey.read`) rather than simple role-name checks.

6. **Status history tracking** -- Opportunities track full status history with who changed it and why, plus a separate approvals workflow.

7. **Offline-ready models** -- Survey and daily report models include `offlineId` and `syncedAt` fields for future offline-first PWA support.

8. **Flexible JSON columns** -- Canvas state, device specs, field data, and settings are stored as JSON for extensibility without schema changes.

9. **Per-tenant device pricing** -- The device library is global, but each tenant can override availability and cost/sell prices via `TenantDevice`.

10. **OPP number is permanent** -- The opportunity number (OPP-XXXXX) is the permanent identifier. Project numbers (PN-XXXXX) are assigned later and never replace the OPP number.

---

## 13. Commit History Highlights

| Hash | Description |
|---|---|
| `8f54901` | Phase 1 foundation -- scaffold CASDEX platform |
| `6be822f` | Phase 2 -- Opportunities module with full lifecycle pipeline |
| `cb3b939` | Phase 3 -- Dashboard home page with role-based widget grid |
| `65e1729` | Restyle dashboard to Tabler admin template layout |
| `9a94187` | Deployment config for Railway (API) and Vercel (frontend) |
| `32c229a` | Auto-seed database on startup |
| `d567d18` | Initial Prisma migration |
| `2274c39` | Fix CORS for all Vercel preview/production URLs |
| `0b87574` | Global admin management portal (NinjaOne-style) |
| `096fee0` | Enforce global admin isolation from regular app |
| `9c0de8f` | Fix POST request error for users API |
| `51f6105` | Set up CASDEX test environment |

---

## 14. Commands Reference

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start API + web in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all workspaces
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed default data (roles, etc.)
pnpm db:studio        # Open Prisma Studio (DB browser)
```

---

## 15. Dependencies

### API

- NestJS 10.4
- Prisma 6.2
- Passport.js + passport-jwt
- bcryptjs
- class-validator, class-transformer

### Frontend

- Next.js 14.2
- React 18.3
- Zustand 5
- Tailwind CSS 3.4

### Dev Tooling

- TypeScript 5.7
- Turborepo 2.3
- pnpm 9.15
