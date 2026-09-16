# Project Architecture Digest

## Tech Stack

- Next.js (App Router), TypeScript, Tailwind CSS, Supabase / Prisma

## Key Directory Structure

- `/src/app`: Page routes and API endpoints
- `/src/components`: UI components (keep under 150 lines per file)
- `/src/lib`: Supabase/Prisma client & shared utilities
- `/types` or `/src/types`: Global TypeScript definitions

## Core Database Schema (Summary)

- Maintain key table names and primary foreign key relationships here.

## Code Conventions

- Use Functional Components with TypeScript interfaces.
- Apply utility-first Tailwind CSS.
- Keep components modular and atomic.

## Rendering Architecture (ISR)

All public pages use standard Next.js ISR (Incremental Static Regeneration).

- `generateStaticParams` on all public pages/layouts for build-time prerender
- `export const revalidate` per route (300s list, 60s detail, 3600s guide/faq)
- `force-dynamic` only on admin pages and debug APIs
- `cacheComponents: true` is NOT used (rolled back 2026-09)
- DB queries use `Promise.allSettled` for parallel execution
- Public read functions in `src/lib/supabase-cms.ts` (no cookies/headers)

### Performance Targets

- List pages: ~60ms warm (SSG + ISR HIT)
- Detail pages: ~60ms warm (SSG + ISR HIT)
- Cold start: <6s (first request after deploy)

## Admin Modal System

All admin CRUD modals use a shared shell architecture:

- `ModalShell` (`src/components/inline-cms/ModalShell.tsx`): base overlay + sticky header + scrollable content + optional footer
- `EditModalShell` (`src/components/inline-cms/EditModalShell.tsx`): ModalShell + save/cancel footer
- Entity-specific modals (HotelEditModal, RestaurantEditModal, GolfEditModal, etc.) compose these shells
- Outside-click and Escape-to-close are blocked; only X / cancel / save-success close are allowed
- Design system rules: `docs/06_디자인시스템_가이드라인.md`
