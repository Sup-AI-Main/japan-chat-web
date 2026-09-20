# Japan Chat Web — Core Agent Rules

Project: `japan-chat-web`  
Stack: Next.js App Router + TypeScript + Supabase/PostgreSQL

## Always follow
- Work on one logical task at a time and make the smallest correct change.
- Use targeted searches by default. Repository-wide search is allowed for explicit audits/exhaustive verification or when all call sites must be found.
- Follow Next.js App Router boundaries. Prefer Server Components/server-side data access; add `'use client'` only when state, effects, browser APIs, or event handlers require it.
- Use explicit TypeScript types. Avoid `any` unless unavoidable and local.
- Keep Supabase privileged access server-side. For SSR auth/session integration, follow the project's approved `@supabase/ssr` pattern; do not add dependencies during unrelated work.
- Never expose `service_role`, secret keys, admin credentials, or privileged tokens to client code.
- Public reads and admin writes are separate security boundaries. Never make an admin API public to fix a public-read issue.
- Never disable/weaken RLS, policies, grants, or auth as a shortcut.
- Never invent, reset, truncate, or silently delete production data.
- Admin **Delete** means real DB hard DELETE unless an approved product spec explicitly says otherwise.
- `0 rows affected` must never be reported as successful deletion.
- A toast or HTTP 2xx is not persistence proof. Verify changed CRUD after reload and, for DB mutations, with DB queries.
- Never claim production verification unless the intended deployment and relevant production behavior were actually checked.
- QA/completion evidence is text-only; do not use screenshots as proof.
- Treat `CODE_VERIFIED`, `DB_VERIFIED`, `FUNCTION_VERIFIED`, and `DEPLOY_VERIFIED` as independent claims.

## Verification retry guardrails
- **Do not accept Production E2E results as verification of the latest code until the deployed production SHA matches the intended/pushed SHA.** If the SHAs differ, classify the result as deployment timing/mismatch, not as proof for or against the latest change.
- If the same verification fails **2 times**, a third automatic retry is forbidden. Stop immediately and report `BLOCKED` instead of looping.
- A `BLOCKED` report must include:
  - failed command or request,
  - HTTP status (when applicable),
  - stderr/error output,
  - facts already confirmed,
  - facts still unknown,
  - exactly **one** next action required to proceed.
- Infinite or open-ended retry loops are forbidden. Do not keep changing code merely because verification infrastructure, authentication, deployment timing, or environment state is unresolved.

## Read only when relevant
Do **not** preload every agent document.

- Supabase/schema/RLS/RPC/migration/DB-security work → `docs/agent/supabase.md`
- DELETE/CASCADE/destructive CRUD → `docs/agent/crud-delete.md`
- CMS/entities/relations/FAQ/EAV/content model → `docs/agent/cms-data-model.md`
- Final QA/regression/Vercel/production verification → `docs/agent/verification.md`

Read multiple detail files only when the task genuinely spans those areas. See `docs/agent/README.md`.

## Approval
An already-approved TODO/spec authorizes changes explicitly inside its scope. Do not request duplicate approval.

Ask before destructive/structural changes **outside** approved scope, including destructive schema removal, unexpected FK semantic changes, breaking public API/auth changes, or irreversible production-data transformations.

## Source of truth
For DB work, never guess. Cross-check:
1. actual Supabase production state,
2. committed migrations,
3. `docs/06_DB_스키마_운영가이드.md`.

If they disagree, report the drift and establish production reality before changing anything.

## Priority
User request / approved TODO > security & production-data safety > production reality > project contracts/specs > existing architecture > minimal correct change > verification > token/time saving.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
