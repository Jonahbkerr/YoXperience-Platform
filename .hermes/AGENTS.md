# YoXperience Platform

> Adaptive UI engine for SaaS — AI-driven A/B testing and real-time layout adaptation.

## Architecture

Monorepo (npm workspaces) with 4 packages:

| Package | Path | Role | Port |
|---|---|---|---|
| `@yoxperience/gateway` | `packages/gateway/` | Express.js backend (TS) | 3457 |
| `@yoxperience/landing` | `packages/landing/` | Marketing site (React + Vite) | 5173 |
| `@yoxperience/dashboard` | `packages/dashboard/` | Admin dashboard (React + Vite) | 5174 |
| `@yoxperience/sdk` | `packages/sdk/` | Client SDK for adaptive UIs | — |

### Stack

- **Backend**: Express.js + TypeScript (run via `tsx`)
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (access 15m / refresh 30d httpOnly cookie)
- **Frontend**: React 19, Vite, React Router v7
- **Package manager**: npm (workspaces)

### Key commands

```bash
npm run setup           # install deps + migrate DB
npm run dev             # start all 3 services concurrently
npm run build           # build landing + dashboard for prod
npm run start           # gateway in production mode

# Individual
npm run dev:gateway     # gateway only (port 3457)
npm run dev:landing     # landing only (port 5173)
npm run dev:dashboard   # dashboard only (port 5174)
npm run dev:mvp         # MVP server (experimental)
```

### Environment

Key env vars: `DATABASE_URL`, `JWT_SECRET`, `GATEWAY_PORT`, `CORS_ORIGINS`, `NODE_ENV`

### Database

Tables: organizations, users, org_memberships, projects, api_keys, refresh_tokens
Migrations via drizzle-kit: `npm run gateway:migrate`

### Vercel

Deploy config in `vercel.json`. Landing + dashboard are static; API routes proxy to `yo-xperience-api.vercel.app`.
