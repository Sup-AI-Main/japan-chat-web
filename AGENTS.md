# Web App Agent Development Rules (Core)

**Goal:** Smallest correct change, preserve architecture, token efficiency, text-only verification, protect production/security.

## 1. EXECUTION & CONTEXT

- **Single Task:** Work on ONE logical task at a time. Do not expand scope into unrelated refactoring.
- **Context Control:** NO full repository scans. Use targeted searches, exact paths, and inspect only relevant functions/imports (±50–100 lines).
- **Plan First:** Create a short text-based TODO list before implementation.

## 2. DOCS & APPROVALS

- **Targeted Docs:** Read ONLY relevant documentation (IA, ERD, API, UI docs) required for the current task. Sync docs _only after_ making material changes.
- **Structural Approval REQUIRED:** You MUST get explicit user approval BEFORE altering: DB tables/columns, enums, foreign keys, public APIs, auth flows, or major architecture. (Bug/UI fixes do not need approval).

## 3. DB, API & SECURITY

- **DB Safety:** Never invent schemas. Sources of truth: `docs/04_ERD.md` & migrations. NEVER reset prod tables, delete prod data, or disable RLS/policies.
- **API Contracts:** Verify request/response shape, auth, and DB mutation. Do not silently change public API contracts.
- **Security:** Auth must be handled server-side. NEVER expose secrets, commit credentials, hardcode keys, or expose raw server errors to users.

## 4. UI, UX & CODE DISCIPLINE

- **Implementation:** Mobile-first. Reuse existing shared UI components, hooks, and helpers. Make the smallest safe change.
- **State Handling:** Account for loading, success, empty, and error states. Prevent duplicate actions (e.g., double submit).
- **Dependencies:** Do NOT add new packages or run broad updates without explicit need/approval.

## 5. CRITICAL: NO IMAGE QA (TEXT ONLY)

- **Global Rule:** ALL QA, testing, and completion reporting MUST BE TEXT-ONLY.
- **Prohibited:** NO image input, NO vision analysis, NO screenshot generation/attachment.
- **Verification Method:** Use DOM inspection, computed styles, network logs, console errors, and behavior/persistence on reload.

## 6. TESTING & DEPLOYMENT

- **Targeted Testing:** Use the cheapest valid verification (Code inspect -> Lint -> Browser -> API -> Full build). Do not run full suites unprompted.
- **CRUD Verification:** Verify persistence (items actually appear/change/disappear after reload), not just UI success toasts.
- **Production Safety:** Local `build` PASS ≠ Production PASS. Report `DEPLOYED` ONLY if Vercel build is READY and prod live smoke test passes.

## 7. COMPLETION REPORT

- At the end of a task, provide a concise text report containing ONLY:
  1. Modification Summary (3-4 lines)
  2. Modified Files
  3. Docs Updated
  4. Verification Performed / Remaining.
- Priority: User Request > Security > Specs > Minimal Change > Verification > Token saving. (Do not sacrifice safety for tokens).

## Supabase Database

- Use `DATABASE_URL` from `.env.local` for direct PostgreSQL access.
- Do not use or request Supabase MCP.
- Host: `aws-0-ap-southeast-1.pooler.supabase.com`
- Port: `5432`
- Database/User: `postgres`
- Never print or commit credentials.
- Inspect rows before modifying data.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
