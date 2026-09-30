# Category Template Routing TODO

## Phase 0 — Reconnaissance

- [x] Read `AGENTS.md` and relevant CMS/schema guidance.
- [x] Inventory all category route producers and all category page routes.
- [x] Inventory category columns, group values, active behavior, icon behavior, and content JSON sources.
- [x] Record current production/schema/migration drift before any DB change.
- [x] Identify all current 404 URL patterns from text logs or HTTP responses.

## Phase 1 — Contract

- [x] Define the template contract: `GOLF`, `HOTEL`, `RESTAURANT`, `ATTRACTION`, `AREA`, `COMMON`.
- [x] Decide whether an existing column can represent the contract; otherwise design a minimal `template_type` migration.
- [x] Define allowed group/template combinations.
- [x] Define behavior for missing, inactive, and unknown categories.
- [ ] Document the contract in the schema operations guide.

## Phase 2 — Routing

- [x] Implement one typed route resolver shared by server/client-safe callers.
- [ ] Add tests for every template type and invalid input.
- [x] Replace arbitrary `/${area}/${category}` links.
- [x] Update public area/home category links.
- [ ] Update admin dashboard and management links.
- [x] Disable or correct prefetch for links that cannot resolve.

## Phase 3 — DB content rendering

- [x] Make AREA pages resolve the selected category and load its DB JSON/content.
- [x] Make COMMON pages resolve the selected category and load its DB JSON/content.
- [x] Preserve existing Golf/Hotel/Restaurant/Attraction layouts.
- [x] Reuse existing JSON/detail renderers.
- [ ] Ensure inactive/unknown records intentionally call `notFound()`.
- [ ] Ensure a valid new category never calls `notFound()` merely because it has no optional content yet.

## Phase 4 — Emoji behavior

- [x] Keep emoji picker and direct input.
- [x] Stop writing `📌` as an automatic create/update value.
- [x] Store empty icon as the agreed null/empty representation.
- [x] Keep any fallback emoji display-only.
- [ ] Add tests proving user-selected and empty icon values persist correctly.

## Phase 5 — Verification

- [x] Run targeted unit tests.
- [x] Run typecheck.
- [x] Run lint.
- [ ] Test an active AREA category with DB content.
- [ ] Test an active COMMON category with DB content.
- [ ] Test a system template category.
- [ ] Test inactive and unknown categories return intentional 404.
- [ ] Confirm no arbitrary category link points at a nonexistent route.
- [ ] Confirm no repeated route 404s are caused by prefetch.
- [ ] Check deployed SHA before any production E2E claim.

## Final review gate

- [x] No destructive schema/data changes outside approved scope.
- [x] No service-role or secret exposure.
- [x] No screenshot/image evidence used.
- [ ] Report `CODE_VERIFIED`, `DB_VERIFIED`, `FUNCTION_VERIFIED`, and `DEPLOY_VERIFIED` independently.