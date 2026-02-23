# YoXperience Platform

## Overview

YoXperience is an adaptive UI engine for SaaS applications. It automatically A/B tests and adapts application layouts in real-time to maximize user engagement using AI-driven telemetry. The platform is a monorepo with three packages: a landing page, a dashboard (management UI), and an API gateway (backend). Users sign up, create organizations, manage projects, generate API keys, and invite team members.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

The project uses npm workspaces to manage three packages under `packages/`:

- **`@yoxperience/gateway`** — Express.js backend API server (port 3457)
- **`@yoxperience/landing`** — Public marketing/landing page built with React + Vite (port 5173)
- **`@yoxperience/dashboard`** — Authenticated management dashboard built with React + Vite (port 5174, served under `/dashboard/` base path)

Root scripts coordinate all packages: `npm run dev` starts all three concurrently. `npm run start` runs the gateway in production mode, which also serves the built static files for both frontends.

### Backend (Gateway)

- **Framework**: Express.js with TypeScript, run via `tsx` in development
- **Database**: PostgreSQL with Drizzle ORM
  - Schema defined in `packages/gateway/src/db/schema.ts`
  - Migrations managed by `drizzle-kit` and stored in `packages/gateway/drizzle/`
  - Connection via `pg.Pool` using `DATABASE_URL` environment variable
- **Authentication**: JWT-based with access/refresh token pattern
  - Access tokens: 15-minute expiry, sent via Authorization header
  - Refresh tokens: 30-day expiry, stored as SHA-256 hashes in the database, sent via httpOnly cookie (`yxp_refresh`)
  - Password hashing with bcrypt (12 salt rounds)
  - `JWT_SECRET` environment variable (falls back to dev default)
- **Authorization**: Role-based organization access (owner > admin > member) enforced by `requireOrgAccess` middleware
- **API Routes**:
  - `/auth` — signup, login, refresh, logout, me
  - `/api/organizations/:orgId` — org CRUD
  - `/api/projects` — project CRUD within org context
  - `/api/projects/:projectId/keys` — API key management (create, list, revoke)
  - `/health` — health check endpoint
- **Production serving**: Gateway serves built landing page at `/` and dashboard SPA at `/dashboard/*`

### Database Schema

Tables (PostgreSQL):
- **organizations** — id, name, slug (unique), plan (hobby/pro/enterprise), timestamps
- **users** — id, email (unique), name, password_hash, email_verified, timestamps
- **org_memberships** — id, user_id, org_id, role (owner/admin/member)
- **projects** — id, org_id, name, slug, core_api_url, timestamps
- **api_keys** — id, project_id, name, key_prefix, key_hash, last_four, type (publishable/secret), is_active, timestamps, last_used_at
- **refresh_tokens** — id, user_id, token_hash, expires_at, revoked_at

### Frontend (Dashboard)

- **Framework**: React 19 with TypeScript, Vite, React Router v7
- **Styling**: CSS custom properties (design tokens with `--yc-` prefix), inline styles — no CSS framework
- **Icons**: lucide-react
- **Auth flow**: `AuthContext` provider manages user state, token storage (in-memory), and auto-refresh. `ProtectedRoute` and `AuthRoute` components handle routing guards.
- **API client**: Simple fetch wrapper (`packages/dashboard/src/lib/api-client.ts`) that attaches Bearer token and handles credentials
- **Pages**: Overview, Projects (list + detail), Team Members, Org Settings, Sign In, Sign Up
- **Dev proxy**: Vite proxies `/auth`, `/api`, `/health` to the gateway at localhost:3457

### Frontend (Landing)

- **Framework**: React with TypeScript, Vite, React Router
- **Purpose**: Marketing/landing page with feature descriptions
- **Styling**: CSS custom properties (same design token system as dashboard)
- **Note**: Has Tailwind CSS directives in `index.css` but Tailwind is not in dependencies — may need setup or removal

### Key Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Secret for signing JWTs (defaults to dev value)
- `GATEWAY_PORT` — Gateway server port (defaults to 3457)
- `CORS_ORIGINS` — Comma-separated allowed origins (defaults to localhost:5173,5174)
- `NODE_ENV` — Set to "production" for static file serving mode

### Setup & Running

- `npm run setup` — Installs dependencies and runs database migrations
- `npm run dev` — Starts all three services concurrently
- `npm run build` — Builds landing and dashboard for production
- `npm run start` — Runs gateway in production mode serving all static assets

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, accessed via `DATABASE_URL` connection string
- **Drizzle ORM** — Schema definition, query building, and migrations
- **drizzle-kit** — Migration generation tool

### Key npm Packages
- **express** — HTTP server framework
- **bcrypt** — Password hashing
- **jsonwebtoken** — JWT creation and verification
- **nanoid** — Unique ID generation for API keys
- **pg** — PostgreSQL client driver
- **cookie-parser** — Parse cookies for refresh token handling
- **cors** — Cross-origin request handling
- **react**, **react-dom**, **react-router-dom** — Frontend framework and routing
- **vite**, **@vitejs/plugin-react** — Frontend build tooling
- **tsx** — TypeScript execution for Node.js (dev server and migrations)
- **lucide-react** — Icon library for dashboard UI
- **concurrently** — Run multiple dev servers simultaneously