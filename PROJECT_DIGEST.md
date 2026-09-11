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
