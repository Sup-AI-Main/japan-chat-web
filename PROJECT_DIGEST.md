# Project Architecture Digest

## Tech Stack
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL

## Key Directories
- `/src/app` — page routes and API endpoints
- `/src/components` — UI components
- `/src/lib` — Supabase repositories, CRUD helpers, auth/shared utilities
- `/supabase/migrations` — committed DB migrations
- `/docs` — product/design/DB documentation
- `/docs/agent` — task-specific Agent rules loaded only when relevant

## Data Architecture
Supabase/PostgreSQL is the runtime source of truth. Google Sheets is not a runtime datastore.

Public reads use the public/server Supabase repository path with RLS. Privileged admin mutations remain server-side.

Current DB details: `docs/06_DB_스키마_운영가이드.md`.

## Rendering Architecture (ISR)
Public pages use standard Next.js ISR where configured.

- `generateStaticParams` is used on public routes that are prerendered.
- Route-specific `revalidate` values control freshness.
- `force-dynamic` is reserved for admin/debug paths where needed.
- `cacheComponents: true` is not used.
- Public read functions live primarily in `src/lib/supabase-cms.ts`.

Verify the current route before assuming a specific revalidation interval.

## Admin Modal System
Shared modal shells:
- `ModalShell` — `src/components/inline-cms/ModalShell.tsx`
- `EditModalShell` — `src/components/inline-cms/EditModalShell.tsx`

Entity-specific modals compose these shells. Current design rules: `docs/06_디자인시스템_가이드라인.md`.

## Agent Context
Start with root `AGENTS.md`. Load only the relevant detail file from `docs/agent/`; do not preload historical task documents.
