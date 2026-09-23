# Phase 3 실행 명령어 — HOTEL → Shared CMS V2 Rollout

> **이 문서는 기존 Phase 3 명령서를 대체한다.**
>
> Phase 2.5에서 이미 만든 공통 CMS V2 엔진을 Hotel에 연결하는 단계다.
> `HotelDetailsEditor` / `HotelDetailsRenderer` 같은 Hotel 전용 복제 컴포넌트를 새로 만들지 않는다.

## 0. Verified baseline

```text
BASELINE_SHA              = 87eb2eab71095c828745d1a2435f8e9a0ed97f40
origin/main               = 87eb2ea
VERCEL                    = SUCCESS
PHASE_0_RESULT            = COMPLETE
PHASE_1_RESULT            = COMPLETE
PHASE_2_RESULT            = COMPLETE
PHASE_2_5_RESULT          = COMPLETE
```

공통 기반은 이미 존재한다.

```text
src/lib/entity-details/
  types.ts
  constants.ts
  validate.ts
  normalize.ts
  diff.ts
  is-empty-value.ts

src/components/entity-details/
  EntityDetailsEditor.tsx
  EntityDetailsEditorModal.tsx
  EntityDetailsSectionEditor.tsx
  EntityDetailsItemEditor.tsx
  EntityDetailsRenderer.tsx
  EntitySaveProgress.tsx

src/lib/revalidate-entity.ts
src/app/api/admin/entity-editor/route.ts
```

## 1. 작업 전 필수 문서

```text
AGENTS.md
docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md
docs/agent/cms-data-model.md
docs/agent/supabase.md
docs/agent/crud-delete.md
docs/agent/verification.md
PHASE_3_HOTEL_EXECUTION_COMMAND.md
PHASE_3_HOTEL_TODO_CHECKLIST.md
```

Next.js 수정 전 현재 설치 버전의 `node_modules/next/dist/docs/`에서 App Router, Route Handlers, `revalidatePath`, Client/Server boundary 관련 문서를 확인한다.

---

# 2. 현재 Production Hotel 상태 — 시작 전에 재검증

현재 직접 확인된 상태:

```text
Hotel total               = 6
Hotel active              = 5
active details_json       = 0
Security Advisor lints    = 0
```

현재 inventory:

```text
beppu_hotel_grandmercure
  id=13a44296-636b-4289-8f7c-6aa4455821c3
  active=true
  legitimate
  details_json=null

dos_hotel_
  id=65dadebb-e0ce-4c28-9a0f-e4b6f918af00
  active=true
  display_name=""
  거의 모든 field empty/null
  details_json=null
  garbage candidate — 증거 확인 후에만 삭제

dos_hotel_bfeeaaa4
  id=5ec9e068-2fdc-48d3-b503-1951d40e70c5
  active=true
  display_name="P1 QA Inactive Test"
  official_name="P1 QA Inactive Hotel"
  details_json=null
  QA candidate — 증거 확인 후에만 삭제

dos_hotel_greenrich
  id=845dffb8-423f-4b5e-b18f-be945c795daa
  active=true
  legitimate
  details_json=null

dos_hotel_holiday
  id=dae6b01b-1fa9-4f97-8ef4-a4955dd72862
  active=true
  legitimate
  details_json=null

test_hotel_1
  id=86e6d1ab-60a4-4730-a55f-753f0e6bbc2b
  active=false
  Legacy Test Hotel
  details_json=null
  Phase 3 backfill 대상 아님
```

`dos_hotel_holiday` legacy child candidate:

```text
content_sections
- 9a244beb-52ae-415c-aec6-542382d905ab
  title="수정된 섹션", content="수정된 내용", is_visible=false
- 2d82764d-84da-4271-8da4-696058f1d9b9
  legacy_id="cs_1788762313142_33j2wn", garbled, is_visible=false
- f9999c19-c38a-420b-8891-fac6d4756c41
  same legacy_id, garbled, is_visible=false

includes_excludes
- 269219ed-e217-459d-976b-3d4301536c72
  INCLUDED, text_kr="다시 수정", is_visible=false
```

문자열만 보고 삭제 금지. QA history / timestamp / dependency를 대조하여 확정한다.

---

# 3. Phase 3 scope

Phase 3에서 한다:

```text
1. Shared foundation Hotel rollout blocker 수정
2. Hotel Production hygiene
3. Hotel variable legacy fields → details_json backfill
4. Hotel public read에 details_json 연결
5. Hotel public details를 EntityDetailsRenderer로 전환
6. Hotel 세부사항 편집을 EntityDetailsEditor로 전환
7. HotelEditModal을 relational core 전용으로 축소
8. 같은 logical detail의 two writable sources 제거
9. targeted revalidation 검증
10. Production Admin E2E
11. Golf/Restaurant/Attraction regression
12. Security/static/deployment 검증
```

하지 않는다:

```text
Restaurant migration
Attraction migration
legacy Hotel columns DROP
field_definitions / section_definitions DROP
includes_excludes / content_sections DROP
FAQ / travel_times / restaurant relations JSON 이동
```

---

# 4. Phase 3-P0 — Shared foundation preflight fixes

## 4.1 STALE_VERSION handling mismatch

현재 baseline:

```text
entity-editor route
  conflict → HTTP 409 + STALE_VERSION

adminFetchJson()
  409 → StaleVersionError throw

EntityDetailsEditor
  성공 response의 result.conflict를 검사
  generic catch에서는 conflictWarning을 켜지 않음
```

즉 409 path에서 `result.conflict` branch는 도달하지 않는다.

수정:

```text
EntityDetailsEditor catch에서 StaleVersionError 명시 처리
→ conflict step = error
→ conflictWarning = true
→ stale overwrite 금지
→ canonical reload
→ warning 유지
```

`adminFetchJson`의 409 typed error 계약은 유지한다.

Shared code 변경이므로 Golf conflict E2E도 다시 한다.

## 4.2 Save pipeline revalidation truthfulness

현재 server는 revalidation exception을 잡고 200 save response를 반환한다. 그런데 client는 성공 response면 `공개 페이지 갱신=success`로 표시한다.

가짜 progress 금지.

권장 response:

```ts
pipeline: {
  persisted: true,
  canonicalRead: true,
  revalidated: true | false,
}
```

client는 실제 값으로 표시한다.

```text
revalidated=true  → success
revalidated=false → warning/error
```

DB 저장이 이미 성공한 뒤 revalidation만 실패했다면 전체 요청을 500으로 돌려 재저장을 유도하지 않는다. 저장 성공과 공개 갱신 실패를 분리한다.

---

# 5. Hotel ownership model

## 5.1 Relational core

```text
entities:
id, slug, entity_type, area_id, display_name, active, sort, created_at, updated_at

hotels core/metadata:
official_name
address
address_jp
phone
google_maps_url
source_url
status
last_verified
```

`source_url/status/last_verified`가 현재 UI에 없다면 Phase 3 때문에 억지 UI를 만들 필요는 없다.

## 5.2 details_json canonical detail

```text
checkin_time
checkout_time
breakfast_summary
breakfast_place
breakfast_time
breakfast_last_entry
dinner_summary
dinner_place
dinner_time
dinner_last_entry
bath_spa_summary
has_public_bath
has_outdoor_onsen
has_sauna
bath_spa_hours
tattoo_policy
atm_payment
transport_note
other_info
```

legacy columns는 DROP하지 않는다. rollback/fallback snapshot으로 남기되 Phase 3 cutover 후 정상 admin write source로 쓰지 않는다.

---

# 6. Hotel JSON structure

`version=1` 유지. Phase 2.5 shared contracts 재사용.

권장 section mapping:

```text
stay_info
  title_ko="체크인/체크아웃"
  checkin_time      type=text
  checkout_time     type=text

breakfast
  breakfast_summary      type=textarea, initial is_visible=false
  breakfast_place        type=text
  breakfast_time         type=text
  breakfast_last_entry   type=text

dinner
  dinner_summary         type=textarea, initial is_visible=false
  dinner_place           type=text
  dinner_time            type=text
  dinner_last_entry      type=text

onsen_spa
  bath_spa_summary       type=textarea, initial is_visible=false
  has_public_bath        type=boolean
  has_outdoor_onsen      type=boolean
  has_sauna              type=boolean
  bath_spa_hours         type=text
  tattoo_policy          type=textarea

other_info
  other_info              type=textarea
  atm_payment             type=textarea 또는 text
  transport_note          type=textarea
```

주소/전화/Maps는 JSON에 복제하지 않는다.

### Boolean semantics

```text
null  = 미확인/미입력
false = 없음/아니오
true  = 있음/예
```

절대 null/false를 합치지 않는다.

### Summary fields

현재 public HotelDetailClient가 `breakfast_summary`, `dinner_summary`, `bath_spa_summary`를 직접 표시하지 않으므로, 데이터는 JSON에 보존하되 initial `is_visible=false`를 권장한다. migration만으로 새 내용을 갑자기 public에 노출하지 않는다.

---

# 7. Dynamic labels → per-entity snapshot

현재 Hotel section/field definitions가 존재한다. Backfill 시 현재 effective public label을 각 Hotel JSON에 seed한다.

```text
backfill 시점 label → 각 entity JSON에 복사
이후 migrated JSON의 section/item label이 canonical
```

JSON path에서는 `getSectionLabel()` / `getFieldLabel()`가 migrated JSON label을 덮어쓰면 안 된다. legacy fallback에서만 사용 가능.

Backfill dry-run에서 각 field의 source column, resolved label, section, type, value, visibility를 출력한다.

---

# 8. Stable IDs / keys

Backfill에서 random ID를 매 실행 새로 생성하지 않는다.

```text
item.key = exact source field key
section keys = stay_info, breakfast, dinner, onsen_spa, other_info, includes, excludes
```

ID는 entity + stable key로 deterministic하게 생성한다.

예:

```text
section id = hotel_<section_key>_<entity_uuid>
item id    = hotel_<field_key>_<entity_uuid>
```

label 수정 / sort 수정 / visibility 수정 시 id/key는 유지한다.

---

# 9. Production hygiene gate — backfill 전에 수행

## Backup rule

백업은 `scripts/backups/` local JSON만 사용한다. **public schema에 `_backup_*` table을 만들지 않는다.**

## `dos_hotel_`

삭제 전 dependency inventory:

```text
entities/hotels
content_sections
includes_excludes
faq
travel_times
restaurant_locations
entity_field_values
기타 FK/reference
```

repo QA history + DB facts로 accidental garbage임을 증명할 때만 hard delete. 애매하면 BLOCKED.

## `dos_hotel_bfeeaaa4`

P1 QA history + timestamp + dependency로 QA artifact임을 증명할 때만 hard delete.

## `test_hotel_1`

inactive이므로 Phase 3 migration/cleanup 대상 아님. 건드리지 않는다.

## Holiday child rows

3 content_sections + 1 includes_excludes 각각 audit. 증명된 QA만 source table에서 먼저 삭제한 뒤 backfill.

현재 active 5에서 위 두 active garbage가 모두 증명되어 삭제되면 legitimate active는 3일 가능성이 높지만 숫자를 하드코딩하지 않는다. 실제 결과를 보고한다.

---

# 10. Hotel backfill script

권장:

```text
scripts/backfill-hotel-details-json.mjs
```

지원:

```bash
node scripts/backfill-hotel-details-json.mjs --dry-run
node scripts/backfill-hotel-details-json.mjs --write
node scripts/backfill-hotel-details-json.mjs --verify
```

필수:

```text
active legitimate Hotel only
inactive skip
details_json != null → 기본 SKIP
local BEFORE backup
admin_save_entity_editor_v1 사용
expected_updated_at 사용
conflict overwrite 금지
all failures report
idempotent
second dry-run = 0 pending writes
```

### destructive repair 금지

Phase 3 이후 legacy columns는 stale snapshot이 된다. 따라서 `--repair`가 legacy columns에서 JSON 전체를 재생성하여 admin JSON edits를 덮어쓰는 구조 금지.

정상 backfill은 `details_json == null` seed 전용이다. metadata repair가 필요하면 value를 건드리지 않는 별도 명시적 작업만 허용한다. `--force-rebuild`를 만들지 않는다.

---

# 11. Hotel type/read layer

현재 baseline 문제:

```text
Hotel interface에 details_json 없음
getHotelById()가 entities.details_json을 select하지 않음
getHotelByEntityIdAdmin()도 details_json select 안 함
```

수정.

`src/lib/types.ts` 상단의 오래된 duplicate EntityDetails type과 `src/lib/entity-details/types.ts` canonical type을 audit한다. 가능하면 canonical shared type을 import/re-export하여 single source로 만든다. Hotel typed boolean JSON이 안전하게 표현되어야 한다.

```ts
Hotel.details_json?: EntityDetailsDocumentV1 | null
```

`getHotelById()`는 `entities(...details_json...)` 포함.

`getHotelByEntityIdAdmin()`도 필요 시 포함.

**Hotel list `getHotels()`에는 full details_json을 추가하지 않는다.**

---

# 12. Hotel public renderer cutover

수정:

```text
src/app/[area]/hotel/[id]/HotelDetailClient.tsx
```

Relational core는 계속 별도로 렌더:

```text
display_name / official_name
address / address_jp
phone
google_maps_url
```

Variable details:

```text
valid details_json → EntityDetailsRenderer
null/invalid       → existing legacy Hotel detail fallback
```

valid JSON path에서 legacy variable JSX를 같이 렌더하면 FAIL.

FAQ는 relational 유지.

valid JSON이 includes/custom content를 소유하면 `IncludeExcludeSection` / `ContentSectionsRenderer`는 skip. legacy fallback에서만 사용.

각 logical detail은 public에 정확히 한 번만 표시.

---

# 13. Hotel admin UX

최종:

```text
[기본정보 수정]
[세부사항 수정]
```

`기본정보 수정` = HotelEditModal core-only:

```text
호텔명(한국어) / entities.display_name
공식명
aaddress / address_jp
phone
google_maps_url
```

`세부사항 수정`은 새 컴포넌트 금지:

```tsx
<EntityDetailsEditor
  entityId={hotel.id}
  entityType="HOTEL"
  ...
/>
```

label/value/type/visibility/sort/add/delete/draft/수정완료/pipeline을 그대로 재사용.

---

# 14. Two writable sources 제거

현재 HotelEditModal은 checkin/breakfast/dinner/boolean/bath/tattoo/other/atm/transport를 legacy columns에 write한다.

Phase 3 이후 이 logical fields는 EntityDetailsEditor만 정상 write source여야 한다.

repo 전체에서 다음 writer callsite를 전수 audit:

```text
/api/admin/hotel
updateHotel(
HotelEditModal
HotelFormPayload
```

권장:

```text
HotelEditModal → core-only payload
/api/admin/hotel PUT → core-only update helper / whitelist
```

필요하면 `updateHotelCore()`를 만든다.

legacy `updateHotel()`를 rollback/import 용도로 남기더라도 normal UI/API에서는 variable detail을 쓰지 않는다. 직접 normal admin API로 migrated variable detail legacy column만 바꿀 수 있는 구조도 가능한 범위에서 차단한다.

---

# 15. Creation flow

새 Hotel 생성은 relational core까지만 생성하고 details_json은 null/empty V1 가능. 이후 `세부사항 수정`에서 JSON detail 입력.

새 Hotel 생성 때문에 variable legacy detail writer를 유지하지 않는다.

---

# 16. Backfill verification

write 직후:

```text
legitimate active Hotel count
details_json count
version=1
sections array
unique section id/key
unique item id/key
placeholder "항목 N" = 0
```

QA markers (`P1 QA`, `수정된 항목`, `수정된 섹션`, `다시 수정`, `test`, garbled QA rows 등)는 source-first audit 후 legitimate active Hotel JSON에서 0이어야 한다.

exact duplicate section title = 0.

same source field를 legacy/custom 양쪽에서 public에 중복 렌더하지 않는다.

---

# 17. Hotel Production public regression targets

```text
/beppu/hotel/beppu_hotel_grandmercure
/dos/hotel/dos_hotel_greenrich
/dos/hotel/dos_hotel_holiday
```

검증:

```text
title/official name
address/address_jp
phone/maps
checkin/out
breakfast
dinner
onsen/spa
boolean semantics
bath hours
tattoo
ATM/payment
transport
other info
FAQ
legitimate custom section
no placeholder
no duplicate
no QA data
```

---

# 18. Production Admin Hotel E2E

**intended SHA가 Vercel Production에 live된 후만 최종 PASS.**

safe target: `dos_hotel_greenrich` 또는 cleanup 이후 정상 Hotel.

BEFORE snapshot:

```text
entities.updated_at
details_json
hotels legacy variable columns
```

## Draft-only

임시 markers:

```text
PHASE3_HOTEL_SECTION
PHASE3_HOTEL_LABEL
PHASE3_HOTEL_VALUE
```

저장 전 DB/public unchanged.

## Single save / pipeline

`수정완료` 후 실제 event 기준:

```text
입력값 검증
변경사항 준비
서버 저장
충돌 확인
저장 결과 재확인
공개 페이지 갱신
완료
```

revalidation failure를 success로 거짓 표시 금지.

## Persistence/public

reopen canonical persistence 확인. targeted revalidation 후 **cache-busting query 없이 standard URL에서** 최신 값 확인.

`?_t=`만 맞고 standard URL stale이면 `HOTEL_TARGETED_REVALIDATION=FAIL`.

---

# 19. Hotel concurrency E2E

Session A/B 동일 T1.

A 저장 → success.

B stale 저장 → HTTP 409 `STALE_VERSION`.

기대:

```text
StaleVersionError catch
conflict step error
conflict warning visible
A preserved
B blocked
canonical reload
```

cleanup.

---

# 20. Hotel boolean E2E

safe boolean field 1개에서 원본 snapshot 후:

```text
null → false → true → null
```

검증:

```text
false public에 사라지지 않음
true 정상
null 숨김
JSON typed boolean/null 유지
legacy relational boolean은 JSON edit로 변경되지 않음
```

마지막 원본 복원.

---

# 21. Core vs details divergence E2E

Core field(예: phone) 임시 수정:

```text
relational core 변경
details_json variable data 불필요 변경 없음
public core 반영
```

원복.

JSON detail 임시 수정:

```text
details_json 변경
legacy variable column unchanged
public JSON 반영
```

원복.

같은 logical variable detail이 core modal/API와 JSON editor 양쪽에서 독립적으로 write 가능하면 FAIL.

---

# 22. Regression

Shared editor/API를 건드리므로 Golf 필수:

```text
/beppu/golf/beppu_golf_amagase
/dos/golf/dos_golf_kaho
/dos/golf/dos_golf_winners
/dos/golf/dos_golf_forest_nankan
```

검증:

```text
active 9/9 details_json
placeholder 0
QA marker 0
Golf includes_excludes rows 0
renderer/save/conflict UI/revalidation
```

Restaurant는 Phase 4 migration 금지. representative list/detail/admin regression만.

Attraction은 Phase 5 migration 금지. representative list/detail/edit regression만.

---

# 23. Security

현재 baseline:

```text
Security Advisor = 0
admin_save_entity_editor_v1:
  args=(uuid,timestamptz,jsonb)
  SECURITY DEFINER=true
  search_path=public,pg_temp
  EXECUTE=postgres/service_role only
```

RPC를 바꿀 필요가 없으면 바꾸지 않는다. 과거 4-arg skeleton을 보고 signature 변경 금지.

DB/function/grant 변경 시 migration + ACL + search_path + Security Advisor 재검증.

service role client 노출 금지.

public backup table 생성 금지.

---

# 24. Performance

```text
Hotel list: details_json fetch 금지
Hotel detail: one details_json
Admin editor: one entity GET
N+1 금지
all-Hotel revalidation 금지
changed detail + list path만 revalidate
```

---

# 25. Static verification

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:cms-schema
git diff --check
```

신규 lint 0.

---

# 26. Commit / deployment

권장 logical commits:

```text
fix(cms-v2): harden shared conflict and revalidation pipeline
refactor(hotel): connect shared details types and renderer
refactor(hotel): make edit modal core-only
feat(hotel): add safe details_json backfill
docs: add Phase 3 verification
```

DB-only cleanup은 억지 빈 commit 만들지 않는다.

push 후:

```text
FINAL_IMPLEMENTATION_SHA
origin/main
Vercel Production SHA
```

일치 후 Production E2E.

같은 verification 2회 실패하면 자동 3회 재시도 금지.

---

# 27. Cleanup gate

최종 DB에서:

```text
PHASE3_HOTEL_SECTION = 0
PHASE3_HOTEL_LABEL   = 0
PHASE3_HOTEL_VALUE   = 0
PHASE3_SESSION_A     = 0
PHASE3_SESSION_B     = 0
```

원본 values/public 복원.

---

# 28. COMPLETE 조건

전부 PASS:

```text
shared conflict handling fixed
revalidation pipeline truthful
Hotel hygiene complete
only proven QA/garbage removed
inactive test untouched
local backups only
active legitimate Hotel backfilled
Hotel details_json V1
null/false/true preserved
summary data preserved without surprise exposure
per-entity labels canonical
placeholder labels 0
no duplicate sections/content
Hotel type/read details_json
shared editor/renderer/pipeline used
HotelEditModal core-only
no two writable sources
targeted revalidation works on standard URL
Hotel normal save/label/boolean/conflict E2E
cleanup markers 0
Golf regression
Restaurant regression
Attraction regression
Security Advisor 0
static PASS
intended SHA live
Production smoke PASS
```

하나라도 실패:

```text
PHASE_3_RESULT: FIX_REQUIRED
```

데이터 삭제 판단이 불명확하거나 infra blocker:

```text
PHASE_3_RESULT: BLOCKED
```

---

# 29. Final Agent Report Format

```text
PHASE_3_BASELINE_SHA:
IMPLEMENTATION_FINAL_SHA:
REPORT_COMMIT:
LATEST_DOC_SHA:

SHARED_CONFLICT_FIX: PASS | FAIL
PIPELINE_REVALIDATION_TRUTHFUL: PASS | FAIL

HOTEL_TOTAL_BEFORE:
HOTEL_ACTIVE_BEFORE:
HOTEL_GARBAGE_AUDIT: PASS | FAIL | BLOCKED
HOTEL_GARBAGE_DELETED:
HOTEL_CHILD_QA_AUDIT: PASS | FAIL | BLOCKED
HOTEL_CHILD_QA_CLEANUP: PASS | FAIL | BLOCKED
INACTIVE_TEST_HOTEL_UNTOUCHED: PASS | FAIL
BACKUP_LOCAL_ONLY: PASS | FAIL

HOTEL_BACKFILL_DRY_RUN: PASS | FAIL
HOTEL_BACKFILL_WRITE: PASS | FAIL
HOTEL_BACKFILL_IDEMPOTENT: PASS | FAIL
HOTEL_ACTIVE_AFTER_HYGIENE:
HOTEL_DETAILS_JSON_COUNT:
HOTEL_PLACEHOLDER_LABELS:
HOTEL_DUPLICATE_TITLES:
HOTEL_SEMANTIC_DUPLICATES:
HOTEL_QA_MARKERS:

HOTEL_SHARED_EDITOR: PASS | FAIL
HOTEL_SHARED_RENDERER: PASS | FAIL
HOTEL_SHARED_PIPELINE: PASS | FAIL
HOTEL_CORE_MODAL_ONLY: PASS | FAIL
TWO_WRITABLE_SOURCE_REMOVED: PASS | FAIL

HOTEL_DRAFT_ONLY: PASS | FAIL
HOTEL_NORMAL_SAVE: PASS | FAIL
HOTEL_LABEL_EDIT: PASS | FAIL
HOTEL_BOOLEAN_NULL_FALSE_TRUE: PASS | FAIL
HOTEL_CONFLICT_BLOCK: PASS | FAIL
HOTEL_CONFLICT_UI_VISIBLE: PASS | FAIL
HOTEL_SESSION_A_PRESERVED: PASS | FAIL
HOTEL_CANONICAL_RELOAD: PASS | FAIL
HOTEL_TARGETED_REVALIDATION: PASS | FAIL
HOTEL_CLEANUP: PASS | FAIL

HOTEL_PUBLIC_GRANDMERCURE: PASS | FAIL
HOTEL_PUBLIC_GREENRICH: PASS | FAIL
HOTEL_PUBLIC_HOLIDAY: PASS | FAIL

GOLF_REGRESSION: PASS | FAIL
GOLF_CONFLICT_REGRESSION: PASS | FAIL
RESTAURANT_REGRESSION: PASS | FAIL
ATTRACTION_REGRESSION: PASS | FAIL

SECURITY_ADVISOR_ERRORS:
RPC_ACL: PASS | FAIL
SECRETS_EXPOSED: 0 | N

TYPECHECK: PASS | FAIL
BUILD: PASS | FAIL
LINT_PREEXISTING:
LINT_NEW:
CMS_SCHEMA_VERIFY: PASS | FAIL
DIFF_CHECK: PASS | FAIL

FINAL_SHA:
ORIGIN_MAIN_SHA:
VERCEL_STATUS: SUCCESS | FAILURE

CODE_VERIFIED: YES | NO
DB_VERIFIED: YES | NO
FUNCTION_VERIFIED: YES | NO
DEPLOY_VERIFIED: YES | NO

PHASE_3_RESULT: COMPLETE | FIX_REQUIRED | BLOCKED
```

---

# 30. Agent 실행 프롬프트

```text
AGENTS.md를 먼저 읽고 적용하세요.

그 다음:
docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md
docs/agent/cms-data-model.md
docs/agent/supabase.md
docs/agent/crud-delete.md
docs/agent/verification.md
PHASE_3_HOTEL_EXECUTION_COMMAND.md
PHASE_3_HOTEL_TODO_CHECKLIST.md

를 읽으세요.

현재 origin/main baseline이
87eb2eab71095c828745d1a2435f8e9a0ed97f40
인지 먼저 확인하세요.

다르면 reset/revert하지 말고 새 diff와 명세를 대조하여 scope를 재계산하세요.

Phase 3는 Hotel rollout입니다.
새 HotelDetailsEditor/HotelDetailsRenderer를 만들지 말고
Phase 2.5 shared EntityDetailsEditor / EntityDetailsRenderer /
EntitySaveProgress를 재사용하세요.

backfill 전에 Production Hotel hygiene를 먼저 수행하세요.
destructive cleanup은 exact QA/garbage 증거가 있을 때만 수행하세요.
애매하면 BLOCKED.

백업은 local scripts/backups/만 사용하세요.
public schema backup table을 만들지 마세요.

Hotel variable details는 details_json이 canonical write source가 되어야 합니다.
HotelEditModal은 relational core-only로 정리하세요.
same logical variable field가 legacy modal/API와 JSON editor 양쪽에서
independent write 가능하면 COMPLETE 금지입니다.

현재 shared editor의 HTTP 409 STALE_VERSION handling과
save pipeline revalidation truthfulness도 baseline에서 audit하고
명세대로 수정/검증하세요.

Production E2E는 intended SHA가 Vercel Production에 live된 후 수행하세요.
cache-busted URL만 정상이고 standard URL이 stale이면 targeted revalidation PASS로 보지 마세요.

TODO 체크리스트를 위에서부터 모두 수행하고
하나라도 완료 조건이 미달이면 COMPLETE로 보고하지 마세요.

Phase 3를 시작하세요.
```
