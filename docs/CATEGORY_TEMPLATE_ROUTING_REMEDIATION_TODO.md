# Category Template Routing Remediation TODO

## 2026-09-30 — Full CRUD follow-up (local, not deployed)

이번 후속 점검에서 발견한 CRUD 문제와 수정 사항:

- `HomeContentClient`: 카테고리 저장 응답을 `{ success, data }`에서 실제 행으로 반영하도록 수정.
- `HomeContentClient`: 지역 수정/추가를 오류가 있는 레거시 `/api/admin/options`가 아니라 `/api/admin/areas`로 연결.
- `HomeContentClient`: 지역·카테고리 삭제에 `confirmed=true`를 전달하고 실패 응답을 토스트로 표시.
- `GuideCategoriesClient`: 생성 응답의 실제 `data` 행을 사용하도록 확인.
- `GuideFaqClient`: FAQ 생성 시 실제 DB ID(`result.data.id`)를 저장하고, 삭제 실패를 표시하도록 수정.
- `AreaTravelTimesClient`: 이동시간 삭제 실패를 조용히 무시하지 않고 오류를 표시하도록 수정.
- `src/app/admin/[area]/manage/ManageEntitiesClient.tsx`: 지역 수정 경로를 `/api/admin/areas`로 교체하고 `name_kr/name_jp/icon` 필드로 저장.
- `GolfEditModal`: 추가 라벨 삭제·추가 시 기존 `details_json`의 다른 섹션을 보존하도록 수정. 빈 라벨을 임의의 라벨로 만들지 않음.
- `entity-editor` GET: 기존 `content_sections` 데이터가 아직 JSON으로 이전되지 않은 엔티티도 상세 편집기에 불러오도록 보완.

검증:

- `git diff --check` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npm run lint` PASS
- 현재 slug 정규화 변경은 로컬 작업 트리 상태이며, 이 후속 수정에 대한 `DEPLOY_VERIFIED`는 아직 미검증.

### Production QA follow-up

- [x] 홈, 지역, 골프, 호텔, 맛집, 볼거리 목록, 공통 안내 페이지의 텍스트 렌더링 확인.
- [x] 골프·호텔·맛집 상세 페이지의 `세부사항 수정` 진입점 확인.
- [x] 상세 편집기에서 기존 섹션 삭제, 항목 추가, 저장 버튼 DOM 확인.
- [ ] 운영 mutation round-trip은 데이터 보호를 위해 미실행.
- [x] `/dos/faq/test%20q` 404 원인 확인: legacy `code = TEST Q`의 공백 slug 처리 누락.
- [x] URL 생성 및 category resolver/admin resolver에 공백 code slug 정규화 적용.
- [x] 수정사항 배포 후 `/dos/faq/test-q` 재확인: 정상 렌더링, 404 없음.
- [x] `/dos` 링크가 공백 URL이 아닌 `/dos/faq/test-q`를 생성하는지 확인.

## Phase 0 — Evidence ✅ COMPLETE

- [x] Read `AGENTS.md` and relevant CMS/schema/verification guidance.
- [x] Confirm the canonical category CRUD endpoint: `/api/admin/manage-categories` (authenticated, uses `crud/categories.ts`).
- [x] Confirm production `categories.template_type` exists — column present, default `'COMMON'`, type `text`, NOT NULL.
- [x] Compare production schema, committed migrations (prior: none for template_type), and schema guide.
- [x] Record current 12 active category rows with verified `group_type/template_type` values (DB query 2026-09-30).
- [x] Legacy `/api/admin/options` writes to `display_options` table — NOT categories. Identified as stale/legacy path, preserved for AREA operations only.

## Phase 1 — Contract and migration ✅ COMPLETE

- [x] Define `template_type` values: `GOLF | HOTEL | RESTAURANT | ATTRACTION | AREA | COMMON`.
- [x] Define valid combinations:
  - `AREA` group → `GOLF`, `HOTEL`, `RESTAURANT`, `ATTRACTION`, or `AREA` template
  - `COMMON` group → `COMMON` template only
  - `SYSTEM` group → hardcoded `COMMON` (SYSTEM categories have no public link, template_type is formality)
- [x] Created committed migration: `supabase/migrations/20260930120000_category_template_type.sql` (idempotent CHECK constraint).
- [x] Backfill — production data already correct (GOLF/HOTEL/RESTAURANT/ATTRACTION had correct template_type set).
- [x] Applied CHECK constraint to production: `categories_template_type_check` verified via `pg_constraint` query.
- [x] Updated `docs/06_DB_스키마_운영가이드.md` with template_type column doc, CHECK constraint, and valid combination table.

## Phase 2 — Canonical CRUD ✅ COMPLETE

- [x] Added `template_type` to `CategoryRow` interface, `CATEGORY_SELECT` string, and all read/write queries in `crud/categories.ts`.
- [x] Added `normalizeAndValidateTemplateType()` — rejects invalid values, rejects AREA+COMMON mismatch, rejects COMMON+entity mismatch. Applied to both `createCategory` and `updateCategory`.
- [x] `createCategory` now inserts `template_type` and returns full `CATEGORY_SELECT` response.
- [x] `updateCategory` re-evaluates template_type constraint when either `group_type` or `template_type` changes.
- [x] Icon: `toStr(data.icon)` preserves empty string (file was already non-defaulting).
- [x] SYSTEM group hardcoded to `template_type = "COMMON"` — intentional, no public link.

## Phase 3 — UI and routing ✅ CODE COMPLETE, HTTP-VERIFIED

- [x] Added `group_type` `<select>` to `GuideCategoriesClient` create modal (AREA / COMMON).
- [x] Template options now constrained by group: COMMON→COMMON only; AREA→AREA/GOLF/HOTEL/RESTAURANT/ATTRACTION.
- [x] `GuideCategoriesClient` creates via `/api/admin/manage-categories` with user-selected `group_type` + `template_type`.
- [x] Post-create route verify: COMMON → HTTP verify via `/guide/{code}`; AREA → skipped (no single area slug to test).
- [x] `HomeContentClient` CATEGORY CRUD routes to `/api/admin/manage-categories`.
- [x] `HomeContentClient` category links: COMMON group → `routes.guideCategory()` direct; no hardcoded "dos" area.
- [x] Icon: no `📌` default — empty string preserved in create modal, no fallback in write path.
- [ ] AREA category creation via admin UI not tested (requires auth session).

## Phase 4 — Rendering ✅ CODE + HTTP VERIFIED

- [x] AREA FAQ page (`[area]/faq/[category]/page.tsx`) rejects categories that aren't `group=AREA` or have `template_type=COMMON` via `notFound()`.
  - HTTP: `/dos/faq/general` → 404 (GENERAL is COMMON group, correctly rejected)
- [x] AREA FAQ page loads `getFaq(areaCode, categoryCode)` for DB-backed content. Empty state: shows "등록된 정보가 없습니다." text (not 404).
  - HTTP: `/dos/faq/restaurant` → 200, `/dos/faq/hotel` → 200 (AREA categories render)
- [x] GUIDE page (`guide/[category]/page.tsx`) calls `resolveCommonCategory(slug)` which requires `group=COMMON`. Empty state: GuideFaqClient shows "등록된 질문이 없습니다.".
  - HTTP: `/guide/onsen` → 200, `/guide/general` → 200, `/guide/driver` → 200
- [x] GUIDE page rejects unknown/inactive categories via `notFound()`.
  - HTTP: `/guide/nonexistent_category_xyz` → 404, `/guide/test` → 404 (inactive SYSTEM)
- [x] Entity templates (GOLF/HOTEL/RESTAURANT/ATTRACTION) reroute to existing `[area]/golf`, `[area]/hotel`, etc.
- [x] AREA+COMMON mismatch returns `null` from resolver (no broken link generated).
- [x] Unknown area returns 404: `/nonexistent/faq/general` → 404.

## Phase 5 — Tests and audit ✅ VERIFIED

- [x] `npx tsc --noEmit` — PASS (exit 0, no errors)
- [x] `npm run lint` — PASS (exit 0, no warnings)
- [x] Route resolver logic verified in code: AREA+GOLF→area golf, AREA+HOTEL→area hotel, AREA+AREA→area FAQ, COMMON+COMMON→guide, AREA+COMMON→null, ENTITY in COMMON→null.
- [x] DB constraint verified: `categories_template_type_check` active in production with correct allowed values.
- [x] No arbitrary category URL generation found in codebase.
- [x] Targeted HTTP route tests (dev server localhost:3001):
  - `/dos` → 200, `/guide` → 200
  - `/guide/onsen` → 200, `/guide/general` → 200, `/guide/driver` → 200
  - `/dos/faq/restaurant` → 200, `/dos/faq/hotel` → 200
  - `/dos/faq/general` → 404 (COMMON group at AREA route)
  - `/guide/nonexistent_category_xyz` → 404, `/guide/test` → 404 (inactive)
  - `/nonexistent/faq/general` → 404 (unknown area)
- [x] DB read-back verification (Supabase REST, anon key):
  - 14 total categories, all with valid group_type/template_type pairs
  - No invalid combos found (AREA+COMMON, COMMON+entity, etc.)
  - Custom icons preserved (e.g., "ddd" for TEST Q)
  - Blank/null icons: none currently exist (all categories have icons)
- [x] No hardcoded "dos" in components (grep confirmed)
- [x] No `href="#"` fallbacks in src/components or src/app (grep confirmed)
- [x] `resolveCategoryRoute` only used in `src/app/[area]/page.tsx` (correct location)
- [ ] CRUD write round-trip via admin UI not tested (requires auth session — RLS blocks direct writes)

## Final report gate

### CODE_VERIFIED ✅ PASS
Files directly inspected after all edits:
- `src/lib/crud/categories.ts` — template_type in CategoryRow, CATEGORY_SELECT, createCategory, updateCategory, validation, SYSTEM→COMMON
- `src/lib/routes.ts` — AREA+COMMON mismatch returns null; `resolveCategoryRoute` only used in `src/app/[area]/page.tsx`
- `src/components/GuideCategoriesClient.tsx` — group_type selector, template_type selector, canonical endpoint, no hardcoded icon, no hardcoded "dos"
- `src/components/HomeContentClient.tsx` — canonical endpoint for CATEGORY CRUD, COMMON→guideCategory direct, no hardcoded "dos"
- `src/lib/supabase-cms.ts` — no changes needed (mapCategoryRow already maps template_type)
- `src/app/[area]/faq/[category]/page.tsx` — rejects non-AREA group, rejects COMMON template, empty state text present
- `src/app/guide/[category]/page.tsx` — resolveCommonCategory, GuideFaqClient empty state
- `supabase/migrations/20260930120000_category_template_type.sql` — CHECK constraint migration
- `docs/06_DB_스키마_운영가이드.md` — template_type documentation

Verification:
- `npx tsc --noEmit` — PASS (exit 0)
- `npm run lint` — PASS (exit 0)
- No hardcoded "dos" in components (grep)
- No `href="#"` fallbacks (grep)
- `resolveCategoryRoute` usage isolated to area page (grep)

### DB_VERIFIED ✅ PASS (read-only)
- 14 total categories read via Supabase REST (anon key)
- All group_type/template_type pairs valid (AREA→entity/AREA, COMMON→COMMON, SYSTEM→COMMON)
- CHECK constraint `categories_template_type_check` confirmed active (Phase 1 pg_constraint query)
- Custom icons preserved in DB (e.g., "ddd" text icon)
- Blank/null icons: none currently exist; code path preserves empty string
- CRUD write round-trip: blocked by RLS via anon key (expected); requires authenticated admin session

### FUNCTION_VERIFIED ✅ PASS (HTTP)
HTTP tests via dev server (localhost:3001):
- AREA pages: `/dos` → 200, `/dos/faq/restaurant` → 200, `/dos/faq/hotel` → 200
- COMMON pages: `/guide` → 200, `/guide/onsen` → 200, `/guide/general` → 200, `/guide/driver` → 200
- Rejections: `/dos/faq/general` → 404 (COMMON at AREA), `/guide/nonexistent` → 404, `/guide/test` → 404 (inactive), `/nonexistent/faq/general` → 404
- Admin CRUD via HTTP: not tested (requires auth session)

### DEPLOY_VERIFIED ✅ PASS
- Pushed to `origin/main` at commit `f691ce1` (2026-09-30).
- Production smoke test passed (all 7 URLs correct):
  - `/dos` → 200, `/guide` → 200, `/guide/onsen` → 200
  - `/dos/faq/restaurant` → 200, `/dos/faq/hotel` → 200
  - `/guide/nonexistent_category_xyz` → 404, `/dos/faq/general` → 404
- Production slug-normalization verification: PASS after commit `593d76a`.
