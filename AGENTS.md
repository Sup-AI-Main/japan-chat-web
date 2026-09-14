# Token Control & Agent Execution Rules (Strict)

## 1. File Reading & Token Control

- Do NOT perform broad or full-codebase searches unless explicitly requested.
- Do NOT read an entire file larger than 300 lines by default.
- For files larger than 300 lines, inspect only:

  - the relevant function/component,
  - directly related imports/types,
  - approximately ±50–100 lines of surrounding context when necessary.

- Expand the inspected range only when additional context is technically required to safely complete the task.
- Do NOT re-read the same unchanged file section multiple times within the same session.
- Do NOT inspect unrelated directories or files.
- Prefer targeted file search, symbol search, or exact path inspection over repository-wide exploration.
- Do NOT generate or quote large unchanged sections of source code unnecessarily.
- Reuse information already established during the current session instead of rediscovering it.

---

## 2. Documentation First

Before modifying code, consult the relevant project documentation under `docs/`.

Primary project documents:

- `01_메뉴구조도_IA.md` — Menu / Information Architecture
- `02_기능명세서.md` — Feature Specifications
- `03_화면설계서.md` — Screen / Layout Specifications
- `04_ERD.md` — Database Schema
- `05_API정의서.md` — API Definitions
- `06_디자인시스템_가이드라인.md` — UI/UX Design System
- `PROJECT_DIGEST.md` — Current Project Context / Architecture Summary

## Documentation Auto-Creation Rule

If any required project documentation does not exist, DO NOT skip the documentation step and DO NOT implement the feature based on assumptions.

The Agent MUST create the missing document before implementation.

Required project documents:

- `docs/01_메뉴구조도_IA.md`
- `docs/02_기능명세서.md`
- `docs/03_화면설계서.md`
- `docs/04_ERD.md`
- `docs/05_API정의서.md`
- `docs/06_디자인시스템_가이드라인.md`
- `PROJECT_DIGEST.md`

### If a Required Document Is Missing

1. Confirm that the document does not exist.
2. Create the missing document using currently verified project information only.
3. Do NOT invent unknown architecture, DB schema, API contracts, or feature behavior.
4. Clearly mark unknown or unverified information as `TBD`.
5. If the missing information affects a structural decision, show the proposed specification to the user.
6. Obtain user approval before implementing that structural change.
7. After approval, proceed with implementation.
8. After implementation, synchronize the document with the actual completed state.

### Existing Project Without Documentation

If the code or database already exists but the corresponding documentation is missing:

- Inspect only the minimum relevant existing implementation necessary to document the requested area.
- Create the missing documentation based on verified existing behavior.
- Do NOT redesign or reinterpret the existing architecture while documenting it.
- Clearly distinguish:

  - `CURRENT` — verified existing implementation
  - `PROPOSED` — requested but not yet approved
  - `TBD` — information that cannot yet be verified

### Important

Missing documentation is NEVER permission to invent a solution.

The correct sequence is:

`Missing Document`
→ `Create Document`
→ `Record Verified Current State`
→ `Define Proposed Structural Change if needed`
→ `User Approval if structural`
→ `Implementation`
→ `Post-Edit Documentation Sync`

For non-structural changes, once the missing document has been created from verified existing behavior, the Agent may continue implementation without requesting an unnecessary second approval.

### Documentation Reading Rule

Do NOT automatically read every document in full.

Only inspect the document and section relevant to the requested task.

Examples:

- UI/layout change → `03_화면설계서.md` + `06_디자인시스템_가이드라인.md`
- DB change → `04_ERD.md` + relevant `PROJECT_DIGEST.md` section
- API change → `05_API정의서.md` + relevant ERD/specification
- New feature → `02_기능명세서.md` + relevant screen/API/ERD sections
- Navigation/menu change → `01_메뉴구조도_IA.md`

Use existing documentation as the primary source of project context instead of rediscovering architecture through broad source-code inspection.

---

## 3. Missing Specification & Approval Rule

Do NOT invent missing structural specifications.

If the requested work requires a structural change that is NOT already defined in the existing documentation:

1. Inspect the relevant existing documentation.
2. Prepare the required specification/document change.
3. Update or propose the relevant document first.
4. Clearly show the proposed structural change to the user.
5. Wait for user approval.
6. Implement the code only after approval.

### Structural Changes Requiring Approval

User approval is required before implementation when introducing or changing:

- database tables
- database columns
- database enums
- database constraints
- foreign keys or relationships
- major data models
- API contracts
- authentication flows
- authorization flows
- role/permission models
- major page structure
- navigation / information architecture
- major cross-feature architecture

### Changes That Do NOT Require Additional Approval

The user's direct request is sufficient authorization for ordinary changes within the existing architecture, including:

- bug fixes
- UI spacing
- component sizing
- responsive/mobile fixes
- text/copy changes
- styling fixes
- existing CRUD fixes
- validation fixes within existing specifications
- implementation of already documented functionality
- small internal refactors necessary to complete the requested task
- error handling improvements that do not change the public contract

Do NOT stop and request another approval for these ordinary changes unless a previously unknown structural change becomes necessary.

If that happens, stop only at the structural-change boundary and explain what needs approval.

---

## 4. Database Integration & Schema Rules

### Source of Truth

Never invent database:

- tables
- columns
- types
- enums
- constraints
- relationships
- RPC functions
- policies

Use the following as sources of truth:

1. `04_ERD.md`
2. existing migrations
3. `database.types.ts`
4. `PROJECT_DIGEST.md`

Inspect only the relevant portions.

### Conflict Rule

If these sources conflict:

- Do NOT guess which one is correct.
- Do NOT silently modify the schema.
- Report the exact conflict.
- Ask the user which source should be authoritative, unless the current production schema has already been explicitly established by the user.

### Schema Change Rule

If a schema change is necessary but not already documented:

1. Update/propose `04_ERD.md`.
2. Specify:

   - table
   - column
   - data type
   - nullable/not-null
   - default
   - unique constraints
   - foreign keys
   - indexes when relevant
   - RLS/policy implications when relevant

3. Get user approval.
4. Then implement the migration and related code.

### Scope Control

When integrating DB logic:

- Do NOT modify global DB configuration unless explicitly required.
- Restrict edits to the minimum necessary:

  - migration
  - target API route
  - Server Action
  - relevant service/helper
  - relevant types
  - target client module

Do NOT perform unrelated schema cleanup or refactoring.

---

## 5. One Logical Task at a Time

### Core Rule

Work on ONE logical task at a time.

This does NOT mean one file at a time.

A single logical task may require changes across multiple related files.

If multiple files are technically necessary to complete the SAME requested task, they may be modified together.

### Example

If the user requests:

> Add an Admin Hotel Add Feature

The same logical task may include:

- relevant documentation review
- hotel form/component
- related API or Server Action
- required DB integration
- related type definitions
- validation
- relevant documentation sync
- targeted verification

Do NOT stop after modifying only the component if the API or related files must also be changed for the requested feature to work.

### No Unrelated Work

While completing the hotel task, do NOT independently:

- refactor authentication
- modify homepage banners
- redesign reservation pages
- clean unrelated APIs
- rename unrelated variables
- reorganize unrelated folders
- update unrelated dependencies

unless those changes are directly required to complete the requested task.

Do NOT expand scope simply because unrelated problems are discovered.

If an unrelated issue is discovered, report it separately after completing the current task.

### Sequential Execution

Complete the current logical task before beginning another independent task.

---

## 6. TODO Management

Before implementation, create a short TODO list for the current logical task.

Example:

- [ ] Inspect relevant documentation
- [ ] Inspect target code
- [ ] Confirm existing data/API structure
- [ ] Implement requested change
- [ ] Perform targeted verification
- [ ] Sync affected documentation

Keep the TODO list concise.

Do NOT create unnecessary sub-tasks for trivial actions.

Mark completed items immediately:

- `[x]` Completed
- `[ ]` Pending

Do not begin unrelated TODO items while the current logical task remains incomplete.

---

## 7. UI/UX & Mobile Optimization

All UI implementation must follow a mobile-first responsive approach.

Preserve the existing design system unless the user explicitly requests a redesign.

### Mobile Requirements

For new screens or major layout changes, consider and document:

- mobile viewport behavior
- responsive breakpoints
- touch target sizes
- horizontal overflow
- vertical scrolling
- fixed/sticky elements
- modal behavior
- table/card transformation
- input usability
- mobile navigation
- text wrapping
- image/media responsiveness

### Documentation

For new screens or meaningful layout changes, update the relevant sections of:

- `03_화면설계서.md`
- `06_디자인시스템_가이드라인.md`

Do NOT unnecessarily expand documentation for trivial visual fixes.

For example:

- changing button width
- correcting padding
- fixing a typo
- adjusting an existing responsive breakpoint bug

does not require creating a large new design specification.

---

## 8. Code Modification Discipline

Make the smallest safe change necessary to satisfy the requested task.

### Required Behavior

- Preserve existing architecture when possible.
- Reuse existing helpers/components/services before creating new ones.
- Avoid duplicate logic.
- Avoid duplicate schemas.
- Avoid duplicate components.
- Avoid duplicate documentation.
- Do not rewrite entire files when a targeted edit is sufficient.
- Do not perform speculative refactoring.
- Do not change public interfaces unless required by the task.
- Do not change working behavior outside the requested scope.

### Existing Helper Rule

Before creating a new:

- utility
- hook
- component
- API helper
- validation function
- formatter
- DB helper

check the relevant local module or known shared helper location first.

Do NOT perform a full repository search unless necessary.

---

## 9. Post-Edit Documentation Sync

After modifying code, immediately synchronize the documentation affected by that change.

Update ONLY the relevant documents.

Examples:

### UI/Layout Change

Update when materially affected:

- `03_화면설계서.md`
- `06_디자인시스템_가이드라인.md`

### DB Change

Update:

- `04_ERD.md`
- `PROJECT_DIGEST.md`

### API Change

Update:

- `05_API정의서.md`
- `PROJECT_DIGEST.md` when materially relevant

### Feature Behavior Change

Update:

- `02_기능명세서.md`
- relevant screen/API/ERD documentation
- `PROJECT_DIGEST.md` when materially relevant

### Navigation Change

Update:

- `01_메뉴구조도_IA.md`
- relevant screen specification
- `PROJECT_DIGEST.md` when materially relevant

### PROJECT_DIGEST Rule

Update `PROJECT_DIGEST.md` whenever the completed task materially changes:

- architecture
- database
- API
- authentication
- authorization
- permissions
- major feature behavior
- major UI structure
- important production behavior

Do NOT fill `PROJECT_DIGEST.md` with minor CSS adjustments, typo fixes, or insignificant implementation details.

---

## 10. Testing & Command Restrictions

Do NOT run expensive project-wide validation commands through LLM actions unless explicitly requested by the user.

### Prohibited by Default

Do NOT automatically run:

- full `tsc`
- full production build
- full test suite
- broad repository-wide lint
- unnecessary dependency installation
- destructive database commands

Rely on user-provided CLI/build/deployment output for full-project validation unless the user explicitly authorizes otherwise.

### Targeted Verification Allowed

When useful and inexpensive, targeted verification may include:

- targeted lint
- targeted test
- syntax validation
- inspection of changed code
- validation of affected function behavior
- checking relevant types without full-project type-check
- reviewing user-provided logs
- reviewing user-provided build output
- reviewing user-provided production errors

Keep verification scoped to the current logical task.

### Verification Claims

Never claim:

- `BUILD PASS`
- `TYPECHECK PASS`
- `PRODUCTION VERIFIED`
- `DEPLOYMENT VERIFIED`
- `CRUD VERIFIED`
- `MIGRATION VERIFIED`

unless that specific verification was actually performed and supported by real output.

Use accurate statuses instead.

Examples:

- `CODE FIX COMPLETE`
- `TARGETED CHECK COMPLETE`
- `BUILD NOT RUN`
- `PRODUCTION VERIFICATION PENDING`
- `USER-SIDE DEPLOYMENT TEST REQUIRED`

---

## 11. Error Investigation Rules

When fixing a reported bug:

1. Identify the specific failing behavior.
2. Inspect the relevant documentation.
3. Inspect the smallest relevant code path.
4. Identify the root cause before changing code whenever reasonably possible.
5. Fix the root cause rather than masking the symptom.
6. Verify only the affected path.
7. Update affected documentation when necessary.

Do NOT start broad cleanup while investigating a targeted bug.

Do NOT change unrelated working code merely because it could be improved.

If the root cause cannot be established with available evidence, clearly state what remains uncertain instead of guessing.

---

## 12. Production Safety

For production-related changes:

- Do not delete production data.
- Do not reset tables.
- Do not weaken RLS/security policies as a shortcut.
- Do not expose secrets.
- Do not hardcode credentials.
- Do not bypass authentication to make a feature work.
- Do not introduce test credentials into production code.
- Do not change environment variables or global configuration without explicit justification.
- Do not assume local success means production success.

For destructive or irreversible operations, explicitly ask for user approval before execution.

---

## 13. Context & Token Discipline

Optimize for minimal context usage without sacrificing correctness.

### Prefer

- relevant docs
- exact file paths
- symbol/function searches
- targeted line ranges
- existing project summaries
- current-session findings

### Avoid

- repeated repository exploration
- reading unrelated files
- reading entire large files
- repeating previously established findings
- huge code dumps
- unnecessary architectural explanations
- rewriting unchanged code
- generating documentation unrelated to the task

If sufficient information already exists in the current session, reuse it.

---

## 14. Completion Report

When the logical task is complete, provide a concise report.

### 1. Modification Summary

Maximum 3–4 concise lines explaining:

- what was changed
- why
- important resulting behavior

### 2. Modified Files

List only files actually changed.

### 3. Documentation Updated

List the documentation files actually updated.

If no documentation required modification, state:

`Documentation update: Not required for this change.`

### 4. Verification

Clearly state what was actually verified.

Example:

`Targeted verification: PASS`

or:

`Build not run per Agent Execution Rules.`

### 5. Remaining Verification

State only genuine remaining items.

Example:

`Production device smoke test pending.`

Do NOT generate a large final report unless the user explicitly requests one.

---

## 15. Rule Priority

When executing a user request, use the following priority:

1. User's explicit current request
2. Safety and production-data protection
3. Existing approved project documentation
4. Current logical task scope
5. Minimal safe implementation
6. Documentation synchronization
7. Targeted verification
8. Concise completion report

If the user's current request explicitly changes an existing documented behavior, treat the request as the proposed new requirement.

If that request requires a structural change, follow the Structural Change Approval Rule before implementation.

---

## 16. Verification Phrase

Whenever the user asks:

`규칙 적용됐어?`

The response MUST begin exactly with:

`파이프라인 규칙 가동 중!`

No alternative wording may appear before this phrase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
