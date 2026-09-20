# Supabase / DB Rules

Read only for Supabase, schema, RLS, RPC/function, migration, DB-auth, or privileged DB work.

## Source of truth
Cross-check:
1. actual Supabase production schema, constraints, functions, policies, grants, and relevant data shape;
2. committed migrations;
3. `docs/06_DB_스키마_운영가이드.md`.

Never invent schema details. If these disagree, report drift and determine production reality before changing anything.

## Server / keys
- Keep privileged writes server-side.
- Only browser-safe variables may use `NEXT_PUBLIC_`.
- Never expose `service_role`, secret keys, admin credentials, or privileged tokens to browser code.
- For SSR auth/session integration, use the approved `@supabase/ssr` pattern. Do not add it during unrelated work.
- Public reads and admin writes remain separate boundaries. Never make an admin endpoint public to solve a public-read failure.

## RLS / grants / functions
- Do not disable RLS or weaken policies/grants as a shortcut.
- Treat RLS and Data API grants as separate layers.
- For new Data API tables/functions, explicitly verify the required grants; do not assume new public-schema objects are automatically exposed.
- Treat `SECURITY DEFINER` as privileged code. Verify necessity, safe `search_path`, EXECUTE grants, and caller authorization.
- Do not grant privileged RPC execution to `PUBLIC`, `anon`, or `authenticated` unless the product explicitly requires and secures it.
- After schema/RLS/function/grant changes, run targeted SQL and Supabase Security Advisor.

## Migrations
- Approved TODOs authorize structural changes explicitly required by them.
- Ask before unexpected destructive structural changes outside approved scope.
- Inspect affected production rows before changing constraints/FKs.
- Use durable migration files for schema changes; do not reset/truncate production.
- Never fabricate a migration to hide migration-history drift. Establish what actually ran first.

## Atomic writes
Use transactions or an existing/appropriate atomic RPC when multiple related writes must succeed or fail together.

## Performance
Do not drop indexes solely because Performance Advisor reports `unused_index`. Check workload, index age, plans/usage, and intent first.

## Current-doc check
Supabase changes frequently. Before implementing uncertain/changing Supabase behavior, check the current Supabase changelog/docs relevant to the task rather than relying on memory.
