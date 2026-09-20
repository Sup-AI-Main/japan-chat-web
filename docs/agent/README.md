# Agent Rules — Selective Loading

The root `AGENTS.md` is the short always-on rule set. This folder contains task-specific rules so normal work does not spend context/tokens loading every policy.

| Task | Read |
|---|---|
| Small UI/code fix | `AGENTS.md` only |
| Supabase / schema / RLS / RPC / migration | + `supabase.md` |
| Delete / CASCADE / destructive CRUD | + `crud-delete.md` |
| CMS / FAQ / EAV / relationships | + `cms-data-model.md` |
| Final QA / Vercel / production | + `verification.md` |
| Task spans areas | Only the matching files |

Do not preload unrelated detail documents.

## TODO relationship
Agent rules are persistent guardrails. A user-approved task TODO/spec is the execution specification for that task and authorizes changes explicitly inside its scope. Unexpected destructive changes outside scope still require approval.

## Recommended task prompt
> Follow the project Agent rules. Read only the detail rule files relevant to this task, then execute the approved TODO. Do not preload unrelated agent docs.
