# CRUD / Hard Delete Rules

Read only when work touches DELETE, CASCADE, cleanup, destructive admin actions, or CRUD persistence.

## Product rule
When an administrator explicitly chooses **Delete** for CMS-managed data, it means a real database hard DELETE unless an approved product spec explicitly defines another behavior.

Do not substitute `active=false`, hidden flags, soft-delete timestamps, or client-only removal. Those are separate hide/visibility behaviors.

## Success semantics
- Successful DELETE means an actual target row was deleted.
- `0 rows affected` is not success.
- Missing/already-deleted targets use the project's appropriate `NOT_FOUND` / 404 behavior.
- Prefer the actual DELETE result/returned rows to determine success where practical.
- Do not show success solely because the HTTP request completed.

## Required verification
For changed deletion behavior:

```text
create/identify isolated target
-> DB confirms target exists
-> admin/API DELETE
-> correct response
-> reload
-> target absent in UI where applicable
-> DB SELECT confirms target absent
-> repeat same DELETE
-> NOT_FOUND / no false success
```

## Dependencies
For entity deletion, verify intended CASCADE / SET NULL / explicit application cleanup for dependent data.

Current product semantics require entity-specific content not to become unintended orphan data. AREA/global content must not disappear just because one entity is deleted. In particular, SPECIFIC FAQ cleanup and AREA FAQ preservation must be tested separately.

Do not change FK delete behavior without checking relationship semantics and existing production rows.

## Production safety
Use uniquely identifiable isolated test data where possible and clean up only data created for the verification. Never delete pre-existing rows merely because they look like test/orphan data without explicit approval.

## CRUD persistence
For changed CREATE/UPDATE behavior, verify normalized persisted server state after reload. A toast or optimistic client state is not proof.
