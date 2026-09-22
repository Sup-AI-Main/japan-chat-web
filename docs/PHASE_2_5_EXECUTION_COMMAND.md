# Phase 2.5 실행 명령어 — Shared CMS V2 Foundation + Golf Refactor

> **목적**
>
> Phase 3 Hotel 작업을 시작하기 전에 Phase 2 Golf pilot에서 검증된 기능을
> `GOLF/HOTEL/RESTAURANT/ATTRACTION`이 함께 사용할 수 있는 공통 CMS V2 기반으로 정리한다.
>
> 이 단계는 Phase 2를 실패로 되돌리는 작업이 아니다.
> Phase 2의 기능 검증 결과를 유지하면서 **공통화 + Golf 재적용 + 누락 기능 보강**을 수행한다.
>
> 완료 전에는 Phase 3 Hotel 구현을 시작하지 않는다.

---

# 0. Baseline

```text
PHASE_0_RESULT            = COMPLETE
PHASE_1_RESULT            = COMPLETE
PHASE_2_RESULT            = COMPLETE

CURRENT_MAIN_SHA          = ef71e130d5d6c7d2b81a1c38757c948dfbee26a1
PHASE_2_IMPLEMENTATION    = 11b4e90
PHASE_2_UI_QA_REPORT      = 4235d1a
PHASE_2_LATEST_DOC_SHA    = ef71e13
VERCEL                    = SUCCESS
```

현재 Golf Production 기준:

```text
active Golf               = 9
active Golf details_json  = 9/9
duplicate titles          = 0
Golf/CS overlap           = 0
QA markers                = 0
optimistic concurrency    = PASS
Production Admin UI E2E   = PASS
cleanup markers           = 0
```

이 상태를 절대 회귀시키지 않는다.

---

# 1. 작업 전 필수 문서

작업 전에 아래만 관련 범위에 맞게 읽는다.

```text
AGENTS.md
docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md
docs/agent/cms-data-model.md
docs/agent/supabase.md
docs/agent/verification.md
```

Next.js 코드를 수정하기 전에 `AGENTS.md` 지시대로 현재 설치된 Next.js의 관련 문서를
`node_modules/next/dist/docs/`에서 확인한다.

특히 다음 주제의 현재 버전 동작을 확인한다.

```text
App Router
Route Handlers
revalidatePath
Client/Server Component boundary
```

---

# 2. Phase 2.5의 핵심 목표

현재:

```text
GolfDetailsEditor
GolfDetailClient 내부 JSON renderer
GolfEditModal legacy variable detail writes
entity-editor API
```

를 다음 구조로 정리한다.

```text
src/lib/entity-details/
├─ types.ts
├─ validate.ts
├─ normalize.ts
├─ diff.ts
└─ constants.ts

src/components/entity-details/
├─ EntityDetailsEditor.tsx
├─ EntityDetailsEditorModal.tsx
├─ EntityDetailsSectionEditor.tsx
├─ EntityDetailsItemEditor.tsx
├─ EntityDetailsRenderer.tsx
└─ EntitySaveProgress.tsx
```

필요하면 hook:

```text
src/hooks/use-entity-details-editor.ts
```

또는:

```text
src/components/entity-details/useEntityDetailsEditor.ts
```

를 둘 수 있다.

최종 구조:

```text
Golf        ─┐
Hotel       ─┼─> EntityDetailsEditor / EntityDetailsRenderer
Restaurant  ─┤
Attraction  ─┘
```

Phase 2.5에서는 **Golf만 공통 구조에 실제 적용**하고,
Hotel/Restaurant/Attraction 전용 구현은 시작하지 않는다.

---

# 3. 현재 Golf 구현에서 반드시 해결할 문제

## 3.1 `GolfDetailsEditor.tsx` 과밀

현재 한 파일 안에:

```text
local duplicate types
draft state
dirty diff
GET
PUT
concurrency
conflict UX
section CRUD
item CRUD
editor rendering
```

가 모두 들어 있다.

공통 타입/로직/UI로 분리한다.

## 3.2 Item label 수정 불가

현재 item은 사실상:

```text
id
type
value
value_jp
is_visible
```

만 가진다.

사용자가 entity별로 직접 수정할 수 있도록:

```text
key
label_ko
label_jp(optional)
sort
typed value
```

를 지원한다.

## 3.3 JSON label이 public canonical label이 아님

현재 Golf public JSON renderer는:

```ts
sectionLabel(s.key, s.title_ko)
```

를 사용한다.

이 때문에 global `section_definitions`가 JSON에 저장된 entity별 label을 덮어쓸 수 있다.

Phase 2.5 이후:

```text
migrated JSON section/item label = 해당 entity public label의 source of truth
```

로 만든다.

Global `section_definitions` / `field_definitions`는:

```text
legacy fallback
new field/section default
backfill seed
global defaults
```

용도로 유지할 수 있지만,
이미 migrated된 JSON label을 public runtime에서 덮어쓰지 않는다.

## 3.4 Public renderer가 Golf에 박혀 있음

현재:

```text
GolfDetailClient.tsx
```

안의 JSON `.filter().sort().map()` 렌더링을 공통 renderer로 이동한다.

## 3.5 `.filter(Boolean)` 문제

typed value를 도입하면:

```text
false
0
```

이 valid value인데 `.filter(Boolean)`으로 사라질 수 있다.

공통 empty-value 판정 helper를 만든다.

## 3.6 두 개의 writable source

현재 variable Golf detail은:

```text
GolfEditModal          → golf_courses legacy columns
GolfDetailsEditor      → entities.details_json
```

두 곳에서 수정 가능하다.

`details_json`이 public source인데 legacy column만 수정하면 public이 바뀌지 않는 divergence가 생길 수 있다.

Phase 2.5에서 writable source를 정리한다.

## 3.7 저장 Pipeline 없음

현재 `"저장 중..."`만 있다.

사용자가 `수정완료`를 누르면 실제 상태에 기반한 공통 pipeline UI를 표시한다.

## 3.8 Runtime JSON validation 부족

`details_json: unknown`을 API boundary에서 구조 검증하지 않고 RPC로 넘기지 않는다.

---

# 4. 데이터 계약 — `EntityDetailsDocumentV1`

**DB `version`은 계속 1을 유지한다.**
기존 Golf JSON을 깨는 schema version bump 금지.

Additive / backward-compatible 확장으로 구현한다.

권장 TypeScript:

```ts
export type EntityDetailItemType =
  | "text"
  | "textarea"
  | "boolean"
  | "number"
  | "url"
  | "list";

export type EntityDetailItemValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export interface EntityDetailsItem {
  id: string;

  // 새 공통 editor용 metadata.
  // 기존 Golf JSON 호환을 위해 migration 전에는 optional 허용 가능.
  key?: string;
  label_ko?: string;
  label_jp?: string | null;

  type: EntityDetailItemType | string;
  value: EntityDetailItemValue;

  sort?: number;
  is_visible?: boolean;

  value_jp?: string | null;
  legacy_id?: string;

  source?: string;
  source_table?: string;
  source_column?: string;
}

export interface EntityDetailsSection {
  id: string;
  key: string;
  title_ko: string;
  title_jp?: string | null;
  emoji?: string | null;
  sort: number;
  is_visible: boolean;

  source?: string;
  source_table?: string;
  source_column?: string;
  legacy_id?: string;

  items: EntityDetailsItem[];
}

export interface EntityDetailsDocumentV1 {
  version: 1;
  sections: EntityDetailsSection[];
}
```

최종 migration 이후 새로 저장되는 item은:

```text
id
key
label_ko
type
value
sort
is_visible
```

를 명확히 가진다.

### Stable identity 규칙

사용자가 수정하는 것:

```text
section title_ko
section title_jp
section emoji
section visibility
section sort

item label_ko
item label_jp
item type
item value
item visibility
item sort
```

사용자가 일반 UI에서 직접 수정하지 않는 것:

```text
section.id
section.key
item.id
item.key
source metadata
legacy_id
```

**label과 key를 혼동하지 않는다.**

새 section/item 생성 시:

```text
id = crypto.randomUUID()
key = 내부 stable key 자동 생성
```

사용자가 label을 변경해도 key는 유지된다.

---

# 5. JSON source-of-truth 정책

## 5.1 Migrated JSON details

`details_json`이 valid V1이면:

```text
section title = section.title_ko
item label    = item.label_ko
item value    = item.value
visibility    = JSON
sort          = JSON
```

가 canonical public source다.

Global dynamic labels가 migrated JSON label을 덮어쓰지 않는다.

## 5.2 Legacy fallback

`details_json`이 null/invalid일 때만 기존 relational + dynamic labels fallback을 사용한다.

## 5.3 Global definitions 역할

즉시 삭제 금지.

```text
field_definitions
section_definitions
entity_field_values
```

는 Phase 6 전까지 유지한다.

역할:

```text
legacy
default template
new field seed
new section seed
future scoped defaults
```

---

# 6. 공통 Runtime Validator

신규:

```text
src/lib/entity-details/validate.ts
```

최소 검증:

```text
document object
version === 1
sections array
max sections
unique section.id
unique section.key
non-empty title_ko
finite section.sort
boolean section.is_visible

items array
max items per section
unique item.id within document
unique item.key within section
non-empty label for new canonical item
allowed item type
value type matches item type
finite item.sort
boolean item.is_visible
label max length
text max length
list max count
list members string
URL http/https only
payload maximum size
no NaN/Infinity
```

Renderer는 raw HTML을 지원하지 않는다.
`dangerouslySetInnerHTML` 사용 금지.

### Backward compatibility

기존 Golf JSON의 `key/label_ko/sort` 없는 item을 read할 수 있어야 한다.

단, 새 PUT 저장 payload는 normalize 후 canonical shape로 저장하는 것을 권장한다.

---

# 7. Normalize / Compatibility Layer

신규 권장:

```text
src/lib/entity-details/normalize.ts
```

역할:

```text
legacy V1 item → canonical editor draft shape
missing item.key → source_column / deterministic fallback
missing item.label_ko → known mapping / section fallback
missing item.sort → array index based stable sort
missing is_visible → true
string value 유지
```

중요:

- GET/read 시 DB를 자동 수정하지 않는다.
- normalize는 메모리 변환이다.
- Production data enrichment는 별도 명시적 migration script로 한다.

---

# 8. Dirty Diff 공통화

신규:

```text
src/lib/entity-details/diff.ts
```

현재 `GolfDetailsEditor.tsx`의 `countDifferences`를 옮기고 다음까지 비교한다.

```text
section add/delete
section label
section jp label
section emoji
section sort
section visibility

item add/delete
item label
item jp label
item type
item typed value
item sort
item visibility
```

`JSON.stringify` 전체 비교만으로 dirty count를 대충 계산하지 않는다.

---

# 9. `EntityDetailsEditor`

신규:

```text
src/components/entity-details/EntityDetailsEditor.tsx
```

Props 예:

```ts
export type CmsEntityType =
  | "GOLF"
  | "HOTEL"
  | "RESTAURANT"
  | "ATTRACTION";

export interface EntityDetailsEditorProps {
  entityId: string;
  entityType: CmsEntityType;
  onClose?: () => void;
  onSaved?: () => void;
}
```

기능:

```text
canonical load
local draft
server snapshot
dirty count
section add/delete
item add/delete
section label edit
item label edit
value edit
visibility
sort
typed item UI
single save
conflict
canonical reload
unsaved-close protection
save pipeline
```

### Entity type mismatch

GET에서 읽은 `entity_type`과 prop이 다르면 저장 금지 + error.

---

# 10. Section Editor

신규:

```text
src/components/entity-details/EntityDetailsSectionEditor.tsx
```

폼 UI:

```text
emoji
섹션명(label/title)
일본어 label optional
표시 여부
정렬
항목 목록
섹션 삭제
```

internal:

```text
id/key/source
```

는 일반 사용자 폼에서 editable input으로 노출하지 않는다.

필요하면 admin debug text로 read-only 표시.

---

# 11. Item Editor

신규:

```text
src/components/entity-details/EntityDetailsItemEditor.tsx
```

폼 UI:

```text
항목명(label)
일본어 label optional
type
value
표시 여부
정렬
삭제
```

type별 value UI:

```text
text       → input
textarea   → textarea
boolean    → checkbox/toggle
number     → number input
url        → URL input
list       → list rows / add-remove
```

`false`, `0`, `[]`, `null`, `""` semantics를 구분한다.

---

# 12. `EntityDetailsEditorModal`

신규:

```text
src/components/entity-details/EntityDetailsEditorModal.tsx
```

기존:

```text
ModalShell
```

재사용.

기능:

```text
공통 modal
dirty guard
close X
cancel
optional backdrop
Escape behavior
수정완료 button
saving lock
pipeline panel
```

dirty 상태에서 닫기:

```text
"저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?"
```

확인 없이 draft를 버리지 않는다.

---

# 13. Save Pipeline

신규:

```text
src/components/entity-details/EntitySaveProgress.tsx
```

사용자가 `수정완료` 클릭 시 표시.

권장 단계:

```text
1. 입력값 검증
2. 변경사항 준비
3. 서버 저장
4. 충돌 확인
5. 저장 결과 재확인
6. 공개 페이지 갱신
7. 완료
```

상태:

```ts
type SaveStepStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";
```

### 절대 규칙

**가짜 timer progress 금지.**

실제 event가 발생했을 때만 상태를 변경한다.

예:

```text
validation 실제 완료   → validation success
fetch 시작              → server_save running
response conflict       → conflict error
canonical payload 확인  → canonical_read success
server response에서 revalidation 성공 확인 → revalidate success
router.refresh 완료 trigger → refresh success
```

서버 내부 단계를 실시간으로 알 수 없으면
클라이언트에서 완료된 것처럼 미리 애니메이션하지 않는다.

---

# 14. Entity Editor API 강화

대상:

```text
src/app/api/admin/entity-editor/route.ts
```

기존 auth 유지.

## GET

canonical:

```text
id
slug
display_name
entity_type
area
updated_at
details_json
```

가능하면 `area`까지 반환해 targeted revalidation에 재사용.

## PUT

순서:

```text
1 auth
2 safe JSON parse
3 entity lookup
4 entity type whitelist
5 details runtime validation
6 normalize canonical payload
7 RPC optimistic save
8 conflict handling
9 canonical DB re-read
10 targeted revalidation
11 canonical response
```

### Request echo 금지

성공 시 request body를 그대로 돌려주지 않는다.

반드시 DB canonical re-read 결과를 반환한다.

### Response metadata

Pipeline을 정직하게 표시할 수 있도록 예:

```ts
interface EntityEditorPipelineResult {
  validated: true;
  persisted: boolean;
  conflictChecked: true;
  canonicalRead: boolean;
  revalidated: boolean;
}
```

같은 metadata를 반환할 수 있다.

단, 실제 수행하지 않은 step을 `true`로 쓰지 않는다.

---

# 15. Optimistic Concurrency 유지

기존 RPC:

```text
admin_save_entity_editor_v1
```

의 검증된 동작을 깨지 않는다.

확인:

```text
stale write blocked
Session A preserved
current_updated_at returned
updated_at microsecond precision
```

RPC 변경이 정말 필요하지 않으면 Phase 2.5에서 불필요하게 교체하지 않는다.

변경한다면:

```text
migration file
SECURITY DEFINER
search_path
grants
Security Advisor
```

전부 다시 검증.

---

# 16. Targeted Revalidation

공통 helper 권장:

```text
src/lib/revalidate-entity.ts
```

또는 현재 architecture에 맞는 server-only helper.

mapping:

```text
GOLF        → golf
HOTEL       → hotel
RESTAURANT  → restaurant
ATTRACTION  → attraction
```

save success 후:

```text
/{area}/{segment}
/{area}/{segment}/{slug}
```

revalidate.

Phase 2.5에서는 Golf 실제 동작을 검증한다.

ISR 자연 만료를 기다리는 것을 정상 save pipeline으로 간주하지 않는다.

---

# 17. 공통 Public Renderer

신규:

```text
src/components/entity-details/EntityDetailsRenderer.tsx
```

가능하면 pure component.

Props 예:

```ts
interface EntityDetailsRendererProps {
  details: EntityDetailsDocumentV1;
}
```

기능:

```text
section sort
section visibility
section title
section emoji
item sort
item visibility
item label
typed value
empty semantics
custom section
custom field
```

## Empty 판단

공통 helper를 만든다.

예:

```text
null            → empty
""              → empty
"   "           → empty
[]              → empty
false           → NOT empty
0               → NOT empty
```

## Render rules

```text
text       → label + text
textarea   → label + whitespace-pre-line
boolean    → label + 예/아니오 또는 ✓/✗
number     → label + number
url        → safe anchor
list       → label + list
```

single-item section이라도 item label 정책을 명확히 한다.

현재 Golf public appearance를 불필요하게 크게 바꾸지 않는다.

---

# 18. Golf public 적용

수정:

```text
src/app/[area]/golf/[id]/GolfDetailClient.tsx
```

현재 inline JSON renderer 제거.

변경:

```tsx
<EntityDetailsRenderer details={course.details_json} />
```

형태로 공통화.

valid V1 helper 사용.

```text
valid JSON → common renderer
invalid/null JSON → legacy fallback
```

## 매우 중요

JSON path에서는 더 이상:

```ts
sectionLabel(s.key, s.title_ko)
```

로 global label을 덮어쓰지 않는다.

JSON `title_ko` / item `label_ko`가 canonical.

Legacy fallback에서만 dynamic label helper를 사용.

---

# 19. Golf Core Edit Modal 정리

현재:

```text
src/components/inline-cms/GolfEditModal.tsx
```

에서 variable details를 편집한다.

Phase 2.5 이후 preferred 역할:

```text
display_name
official_name
address
phone
google_maps_url
```

즉 relational core 전용.

다음은 details editor로 이동:

```text
course_summary
play_cart
clubhouse_dining
bath_shower
rental
dress_code
includes/excludes
custom sections
```

UI label도:

```text
골프장 수정
```

보다 역할이 명확하도록:

```text
기본정보 수정
세부사항 수정
```

으로 분리 가능.

### 절대 조건

같은 logical field가:

```text
legacy core modal
details JSON editor
```

두 곳에서 동시에 independent write 되지 않는다.

---

# 20. Existing Legacy Editors 역할

다음 기존 컴포넌트:

```text
ContentSectionsEditor.tsx
IncludesExcludesEditor.tsx
FieldCreateModal.tsx
FieldPickerModal.tsx
LabelManager.tsx
```

을 그대로 V2 details draft에 연결하지 않는다.

현재 일부는:

```text
click/add/update/delete
→ 즉시 API mutation
```

구조다.

V2 rule:

```text
모든 세부 변경 → local draft
수정완료 → one save
```

기존 컴포넌트는:

```text
legacy admin compatibility
default template
Phase 6 이전 운영
```

용도로 남길 수 있다.

V2 UI에서 아이디어를 재사용하려면 mutation을 제거한 pure/draft component로 별도 분리한다.

---

# 21. Golf JSON Enrichment Migration

기존 active Golf 9건은 이미 valid V1이다.

Phase 2.5 migration은 legacy source에서 JSON 전체를 다시 rebuild하는 repair가 아니다.

목적:

```text
missing item.key
missing item.label_ko
missing item.sort
missing item.is_visible
```

같은 metadata를 안전하게 enrich하는 것.

신규 권장:

```text
scripts/enrich-golf-details-json.mjs
```

modes:

```bash
node scripts/enrich-golf-details-json.mjs --dry-run
node scripts/enrich-golf-details-json.mjs --write
```

필수:

```text
active Golf 9건 inventory
BEFORE JSON snapshot
no relational rebuild
no custom section loss
no item ID replacement
no section ID replacement
no value change
no visibility change
no semantic duplicate creation
optimistic concurrency RPC
conflict overwrite 금지
idempotent
```

### Label parity

현재 public effective label과 migration 후 JSON label이 달라지지 않도록 audit.

현재 renderer가 global label을 override로 쓰고 있으므로,
cutover 전에 현재 effective label을 JSON에 snapshot해야 하는지 확인한다.

예:

```text
section_definitions label
field_definitions label
existing JSON title
known Golf fallback
```

우선순위를 inventory하고,
**public label regression 0**을 증명한 뒤 renderer를 전환한다.

---

# 22. New Section / New Item

새 section:

```text
id = randomUUID
key = stable generated internal key
title_ko = admin input
sort = next sort
is_visible = true
items = []
```

새 item:

```text
id = randomUUID
key = stable generated internal key
label_ko = admin input
type = text default
value = ""
sort = next sort
is_visible = true
```

label을 바꿔도 key/id는 바꾸지 않는다.

같은 document 내 key collision 금지.

---

# 23. Unsaved Changes UX

필수:

```text
dirty count
dirty indicator
close guard
cancel guard
save disabled when clean
save disabled while saving
draft 유지 on save failure
draft 유지 on validation failure
```

conflict 시 현재 Phase 2에서 검증한 정책 유지:

```text
warning visible
canonical latest reload
stale overwrite 금지
```

conflict 발생 후 사용자의 stale draft를 어떻게 처리할지 명확히 결정한다.

최소 Phase 2 검증 동작인:

```text
warning 표시 + server canonical reload
```

는 유지한다.

---

# 24. Save UX

버튼 label:

```text
수정완료
```

권장.

클릭:

```text
pipeline 열림
editor inputs lock
close 방지
validation
save
canonical
revalidate
refresh
success
```

성공 후:

```text
dirty count 0
serverDoc canonical
updatedAt canonical
toast optional
pipeline 완료 표시
```

즉시 modal 자동 close 여부는 UX상 결정 가능하지만,
사용자가 완료 상태를 확인할 시간을 둔다.

---

# 25. Error UX

다음 각각 구분:

```text
validation error
401
entity not found
entity type mismatch
stale conflict
server save error
canonical read failure
revalidation failure
network failure
```

generic raw DB error를 사용자에게 노출하지 않는다.

실패 시:

```text
draft 유지
modal 유지
success 표시 금지
```

---

# 26. Golf Production Data Verification

Phase 2.5 적용 전/후:

```sql
select
  count(*) as active_golf,
  count(*) filter (where details_json is not null) as with_details
from public.entities
where entity_type='GOLF'
  and active=true;
```

기대:

```text
9 / 9
```

duplicate:

```sql
with sec as (
  select e.slug, s->>'title_ko' title
  from public.entities e
  cross join lateral jsonb_array_elements(e.details_json->'sections') s
  where e.entity_type='GOLF' and e.active
)
select slug,title,count(*)
from sec
group by slug,title
having count(*)>1;
```

기대 0.

QA marker:

```sql
select slug
from public.entities
where entity_type='GOLF'
  and active
  and details_json::text ilike '%PHASE25_%';
```

최종 cleanup 후 0.

---

# 27. Golf Production UI E2E — Shared Editor

실제 Production에서 수행.

안전한 Golf 1건 BEFORE snapshot.

## 27.1 Load

```text
세부사항 수정
common EntityDetailsEditor open
GET 200
section/item labels visible
values visible
```

## 27.2 Label edit draft-only

임시:

```text
section label = [PHASE25_SECTION_LABEL]
item label    = [PHASE25_ITEM_LABEL]
item value    = [PHASE25_VALUE]
```

저장 전 DB unchanged.

## 27.3 Section/item CRUD draft-only

임시 custom section/item 추가.

저장 전 DB unchanged.

삭제도 저장 전 DB unchanged.

## 27.4 Visibility

section/item toggle 후 저장 전 DB unchanged.

## 27.5 Sort

순서 변경 후 저장 전 DB unchanged.

## 27.6 Save pipeline

`수정완료`.

확인:

```text
validation
server save
conflict check
canonical read
revalidation
refresh
complete
```

가 실제 결과 기준으로 표시.

## 27.7 DB

label/value/type/sort/visibility가 canonical JSON에 존재.

## 27.8 Public

hard refresh 없이 다음 navigation/reload에서:

```text
new section label
new item label
new value
sort
visibility
```

정상.

Global label이 per-entity JSON label을 덮어쓰지 않음.

## 27.9 Reopen

editor reopen 후 canonical persistence.

---

# 28. Typed Item E2E

Production 또는 안전한 QA entity에서 temporary custom fields로:

```text
text
textarea
boolean
number
url
list
```

각 type을 최소 한 번 검증.

특히:

```text
boolean false
number 0
```

가 public에서 사라지지 않는지 확인.

URL:

```text
javascript:
data:
```

같은 unsafe scheme 허용 금지.

---

# 29. Concurrency E2E 재검증

공통 editor로 refactor한 뒤 반드시 다시 수행.

A/B 동일 T1.

A:

```text
[PHASE25_SESSION_A]
```

저장.

B stale:

```text
[PHASE25_SESSION_B]
```

저장.

기대:

```text
A conflict=false
B conflict=true
conflict UI visible
A preserved
B blocked
canonical reload
```

---

# 30. Core vs Details Divergence E2E

Phase 2.5의 핵심 gate.

## Core modal

임시 core field 수정:

```text
display_name 또는 phone
```

확인:

```text
relational core 변경
details_json variable details 불필요 변경 없음
public core 반영
```

원복.

## Details editor

임시 variable detail 수정:

```text
rental 또는 dress_code
```

확인:

```text
details_json 변경
legacy variable column을 independent public source로 사용하지 않음
public JSON 반영
```

원복.

같은 logical variable detail을 두 UI에서 서로 다른 값으로 저장할 수 있으면 FAIL.

---

# 31. Public Golf Regression

최소:

```text
/beppu/golf/beppu_golf_amagase
/dos/golf/dos_golf_kaho
/dos/golf/dos_golf_winners
/dos/golf/dos_golf_forest_nankan
```

확인:

```text
title/core
all migrated detail sections
labels
values
visibility
sort
FAQ
include/exclude
custom section
Google Maps
admin-only controls
```

duplicate 없음.

---

# 32. Hotel / Restaurant Regression

Phase 2.5에서 아직 migration하지 않는다.

최소:

```text
/dos/hotel/dos_hotel_holiday
/dos/restaurant
```

기존 behavior 유지.

Hotel/Restaurant에 공통 editor를 성급히 연결하지 않는다.

---

# 33. Security

확인:

```text
entity-editor GET auth required
entity-editor PUT auth required
service role server-only
no secret in client bundle
RPC grants unchanged/secure
RLS weakened 없음
```

DB/RPC 변경 시:

```text
actual production function definition
search_path
prosecdef
ACL
Supabase Security Advisor
```

검증.

---

# 34. Performance

```text
list page에서 full details_json fetch 금지
detail/admin에서만 details_json
N+1 금지
entity save 후 전체 entity 순회 revalidate 금지
전체 JSON deep clone 과도한 반복 최소화
```

현재 작은 document에는 `structuredClone` 또는 안전 helper 사용 가능.

JSON stringify/parse clone을 유지할 경우 typed value가 안전한지 검토.

---

# 35. Static Verification

최종:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:cms-schema
git diff --check
```

기록:

```text
TYPECHECK
BUILD
LINT_PREEXISTING
LINT_NEW
CMS_SCHEMA_VERIFY
DIFF_CHECK
```

신규 lint error = 0.

---

# 36. Verification Labels

최종 보고에서 독립적으로 기록:

```text
CODE_VERIFIED
DB_VERIFIED
FUNCTION_VERIFIED
DEPLOY_VERIFIED
```

다른 하나의 PASS가 자동으로 나머지 PASS를 의미하지 않는다.

---

# 37. Deployment Gate

commit/push 후:

```text
origin/main SHA
intended implementation SHA
Vercel deployed SHA
```

가 일치해야 한다.

Production E2E는 **latest intended SHA가 실제 Production READY인 후** 최종 PASS로 인정.

같은 verification이 2회 실패하면 자동 3차 retry 금지.

`BLOCKED` 보고 규칙은 `AGENTS.md` 그대로 따른다.

---

# 38. Commit 전략

권장:

```text
1. refactor: extract shared entity details contracts and validation
2. refactor: replace golf details editor with shared draft editor
3. refactor: add shared entity details renderer and save progress
4. fix: make golf details json the single writable source for variable details
5. chore: enrich golf details json metadata
6. docs: add Phase 2.5 production verification
```

실제 logical change 기준으로 조정 가능.

giant commit 금지.

---

# 39. 문서

업데이트:

```text
docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md
docs/HOTEL_GOLF_RESTAURANT_CMS_FIX_TODO_QA.md
```

필요하면 신규:

```text
docs/PHASE_2_5_SHARED_CMS_V2_FOUNDATION.md
```

에 최종 architecture 기록.

---

# 40. Phase 2.5 COMPLETE 조건

아래 전부 PASS:

```text
[ ] shared EntityDetailsDocument contracts
[ ] runtime validation
[ ] normalization compatibility
[ ] common diff
[ ] common editor
[ ] common section editor
[ ] common item editor
[ ] common modal
[ ] common save progress
[ ] common renderer
[ ] per-entity section label edit
[ ] per-entity item label edit
[ ] stable id/key
[ ] typed values
[ ] false preserved
[ ] 0 preserved
[ ] list/url behavior
[ ] draft-only
[ ] unsaved guard
[ ] one save button
[ ] real pipeline statuses
[ ] canonical DB reread
[ ] targeted revalidation
[ ] no global label override for migrated JSON
[ ] Golf JSON enrichment complete
[ ] Golf active 9/9
[ ] duplicate title 0
[ ] QA marker 0
[ ] two writable source divergence removed
[ ] common editor Production E2E
[ ] typed field E2E
[ ] conflict E2E
[ ] cleanup PASS
[ ] Golf public regression PASS
[ ] Hotel regression PASS
[ ] Restaurant regression PASS
[ ] security PASS
[ ] typecheck PASS
[ ] build PASS
[ ] lint new 0
[ ] verify:cms-schema PASS
[ ] git diff --check PASS
[ ] intended SHA deployed
[ ] Production smoke PASS
```

하나라도 실패하면:

```text
PHASE_2_5_RESULT: FIX_REQUIRED
```

환경/인증/배포 mismatch 등으로 검증 불가:

```text
PHASE_2_5_RESULT: BLOCKED
```

---

# 41. 최종 Agent 보고 형식

```text
PHASE_2_5_BASELINE_SHA:
IMPLEMENTATION_FINAL_SHA:
REPORT_COMMIT:
LATEST_DOC_SHA:

SHARED_TYPES: PASS | FAIL
RUNTIME_VALIDATION: PASS | FAIL
NORMALIZE_COMPATIBILITY: PASS | FAIL
COMMON_DIFF: PASS | FAIL

COMMON_EDITOR: PASS | FAIL
COMMON_SECTION_EDITOR: PASS | FAIL
COMMON_ITEM_EDITOR: PASS | FAIL
COMMON_MODAL: PASS | FAIL
SAVE_PIPELINE: PASS | FAIL
COMMON_RENDERER: PASS | FAIL

SECTION_LABEL_EDIT: PASS | FAIL
ITEM_LABEL_EDIT: PASS | FAIL
STABLE_KEYS: PASS | FAIL
TYPED_VALUES: PASS | FAIL
FALSE_PRESERVED: PASS | FAIL
ZERO_PRESERVED: PASS | FAIL

DRAFT_ONLY: PASS | FAIL
UNSAVED_GUARD: PASS | FAIL
SINGLE_SAVE: PASS | FAIL
CANONICAL_REREAD: PASS | FAIL
TARGETED_REVALIDATION: PASS | FAIL

GLOBAL_LABEL_OVERRIDE_REMOVED_FOR_JSON: PASS | FAIL
GOLF_ENRICHMENT: PASS | FAIL
GOLF_ACTIVE_COUNT:
GOLF_DETAILS_JSON_COUNT:
GOLF_DUPLICATE_TITLES:
GOLF_QA_MARKERS:

TWO_WRITABLE_SOURCE_REMOVED: PASS | FAIL

NORMAL_SAVE: PASS | FAIL
CONFLICT_BLOCK: PASS | FAIL
CONFLICT_UI_VISIBLE: PASS | FAIL
SESSION_A_PRESERVED: PASS | FAIL
PUBLIC_LABEL_VALUE_RENDER: PASS | FAIL
PUBLIC_SORT_VISIBILITY: PASS | FAIL
CLEANUP: PASS | FAIL

GOLF_REGRESSION: PASS | FAIL
HOTEL_REGRESSION: PASS | FAIL
RESTAURANT_REGRESSION: PASS | FAIL

SECURITY: PASS | FAIL
SECURITY_ADVISOR: PASS | FAIL

TYPECHECK: PASS | FAIL
BUILD: PASS | FAIL
LINT_PREEXISTING:
LINT_NEW:
CMS_SCHEMA_VERIFY: PASS | FAIL
DIFF_CHECK: PASS | FAIL

CODE_VERIFIED: YES | NO
DB_VERIFIED: YES | NO
FUNCTION_VERIFIED: YES | NO
DEPLOY_VERIFIED: YES | NO

VERCEL_STATUS: SUCCESS | FAILURE
PHASE_2_5_RESULT: COMPLETE | FIX_REQUIRED | BLOCKED
```

---

# 42. 실행 시작 명령

Agent에게 아래처럼 지시한다.

```text
AGENTS.md를 먼저 읽고 적용하세요.

그 다음:
docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md
docs/agent/cms-data-model.md
docs/agent/supabase.md
docs/agent/verification.md
PHASE_2_5_EXECUTION_COMMAND.md
PHASE_2_5_TODO_CHECKLIST.md

를 읽으세요.

현재 main baseline을 확인한 뒤,
PHASE_2_5_TODO_CHECKLIST.md의 항목을 위에서부터 순서대로 수행하세요.

Phase 2의 검증된 Golf behavior를 회귀시키지 마세요.
Hotel/Restaurant/Attraction rollout을 아직 시작하지 마세요.

모든 detail edit는 local draft여야 하고,
'수정완료' 한 번으로 저장되어야 합니다.

section label과 item label은 per-entity JSON에서 수정 가능해야 합니다.
migrated JSON label을 global label이 runtime에서 덮어쓰면 안 됩니다.

저장 시 EntitySaveProgress pipeline을 실제 작업 결과에 맞춰 표시하세요.
가짜 timer progress는 금지합니다.

같은 logical variable field가 legacy modal과 JSON editor 두 곳에서 독립적으로
write 가능한 구조를 제거하세요.

Production E2E는 intended SHA가 Vercel Production에 READY된 뒤 수행하세요.

완료 조건 하나라도 미달이면 COMPLETE로 보고하지 마세요.

Phase 2.5를 시작하세요.
```
