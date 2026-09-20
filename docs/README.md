# Japan Chat Web — Documentation Map

This directory contains product/design/database documentation. Agent execution rules are intentionally split so unrelated documents are not loaded on every task.

## Product / UI documents
- `01_메뉴구조도_IA.md` — information architecture / menu structure
- `02_기능명세서.md` — product feature specification
- `03_화면설계서.md` — screen/layout specification
- `05_디자인시스템_가이드.md` — canonical design-system guide; verify current component implementation before assuming legacy modal details.

Read only the documents relevant to the task.

## Database
- `06_DB_스키마_운영가이드.md` — current operational DB map, verified against production Supabase and migrations

For DB changes, production Supabase is the primary reality. Cross-check it with migrations and this guide. If they disagree, report drift instead of guessing.

## Agent rules
- Root `../AGENTS.md` — short always-on core rules
- `agent/README.md` — selective-loading map
- `agent/supabase.md` — Supabase/schema/RLS/RPC rules
- `agent/crud-delete.md` — hard-delete/CASCADE rules
- `agent/cms-data-model.md` — CMS/EAV/relationship rules
- `agent/verification.md` — final QA/deployment rules

Do **not** read all agent detail files for every task.

## Historical task documents
Older TODO/audit/migration/rebuild documents in this directory are historical references unless the user explicitly selects one as the current task specification. They do not override current production reality or root Agent rules.
