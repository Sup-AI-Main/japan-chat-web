# 일본 채팅앱 — CMS V2 개별 엔티티 JSON 편집기 / 단일 저장 UX 구현 명세

> 대상 Repo: `Sup-AI-Main/japan-chat-web`  
> 작성 기준 Main SHA: `b468b1d238ec0bb3c4254dc53b51ab381ee3e612`  
> Supabase project_ref: `hzmaypxlpzbnfkevpqss`  
> Production: `https://japan-chat-web.vercel.app`
>
> **중요:** 이 문서는 현재 코드/DB를 기준으로 작성되었다. Agent는 작업 시작 시 반드시 `git fetch origin` 후 현재 `origin/main`과 위 SHA를 비교한다. Main이 이미 이동했다면 **reset/revert 하지 말고**, 이 문서의 요구사항과 새 diff를 대조해서 적용 범위를 다시 계산한 뒤 보고한다.
>
> **현재 확인된 P1 기준 상태:** `b468b1d`에서 `restaurant_locations` read failure 처리가 public `getRestaurantById()`와 admin `getRestaurantByEntityIdAdmin()` 모두에 반영되었고, GitHub `main`과 Vercel deployment가 `SUCCESS`인 것을 확인했다. 이 P1 항목은 CMS V2 작업에서 다시 수정 대상으로 잡지 말고 regression check만 한다.

---

# 현재 기준 상태 — Agent가 작업 전에 반드시 읽을 것

현재 GitHub `main` 기준:

```text
BASELINE_SHA: b468b1d238ec0bb3c4254dc53b51ab381ee3e612
COMMIT: fix: handle restaurant_locations read failures and correct P1 QA evidence
VERCEL: SUCCESS
P1_RESULT: COMPLETE
```

`b468b1d`에서 실제 반영된 내용:

- `src/lib/supabase-cms.ts`
  - public `getRestaurantById()`의 `restaurant_locations` query가 `locationsError`를 검사하고 throw함.
  - admin `getRestaurantByEntityIdAdmin()`도 동일하게 fail-loud 처리함.
- `docs/HOTEL_GOLF_RESTAURANT_CMS_FIX_TODO_QA.md`
  - Playwright DOM visibility QA, actual Admin API canonical CRUD QA, inactive canonical QA, cleanup evidence가 보강됨.
- Vercel commit status는 `success`.

따라서 다음은 **이미 끝난 P1을 재작업하는 문서가 아니다.** 이제부터의 핵심은 사용자 제보로 확인된 CMS 구조 문제와 CMS V2 리팩터링이다.

남은 사용자 요구는 다음 네 축이다.

1. ~~공개 상세의 `예약 전 확인` 중복/예약형 표현 제거.~~ → **Phase 0에서 완료.**
2. 관리자 라벨 수정이 logout 후 public page에도 확실히 반영되도록 persistence 경로 정리. → **Phase 0에서 LabelManager canonical state 수정 완료.**
3. 관리자 편집을 `input 변경마다 즉시 DB write`가 아니라 `draft → 변경사항 저장 1회`로 통일. → Phase 1+에서 구현.
4. 골프장/호텔/식당/볼거리마다 서로 다른 세부 항목/라벨을 **개별 entity JSONB**로 저장하고 generic editor/renderer로 관리. → Phase 1+에서 구현.

주의: 현재 repo의 P1 QA 문서 안에 `restaurant_locations` 수정이 `(uncommitted)`라고 남아 있다면 그것은 `b468b1d` 이후 사실과 맞지 않는 오래된 문구다. 다음 문서 정리 commit에서 `b468b1d`로 교정할 수 있으나, CMS V2 코드 작업의 blocker는 아니다.

---

## 0. 작업 목적

관리자가 골프장 / 호텔 / 음식점 / 주변 볼거리를 수정할 때 지금처럼 라벨 하나, 표시 여부 하나, 추가 안내 하나를 바꿀 때마다 DB 요청이 즉시 발생하는 구조를 정리한다.

최종 목표는 다음과 같다.

1. **엔티티별 개별 관리**
   - 골프장 A에서 바꾼 라벨/세부 항목은 골프장 A에만 적용한다.
   - 호텔 A, 식당 A, 볼거리 A도 동일하다.
   - `모든 골프장에 적용` 같은 글로벌 라벨 UX를 사용하지 않는다.

2. **가변 세부정보를 엔티티별 JSONB로 관리**
   - 골프장마다 상세 항목이 다를 수 있다.
   - 호텔/식당/볼거리도 동일한 편집/렌더링 엔진을 공유한다.
   - 새로운 세부 항목을 추가하기 위해 매번 DB 컬럼 + 타입 + JSX를 하드코딩하지 않는다.

3. **Draft → 한 번에 저장**
   - input / textarea / label / visible / sort / section 추가·삭제는 편집 중 로컬 draft만 바꾼다.
   - 마지막 `변경사항 저장` 버튼 한 번으로 서버에 보낸다.

4. **저장 UX 개선**
   - 저장되지 않은 변경사항 개수 표시.
   - 저장 중 실제 처리 상태를 단계 UI로 표시.
   - 실패 시 입력값을 보존하고 재시도 가능.
   - 성공 시 서버 canonical row로 editor state를 교체.

5. **공개 상세 페이지도 JSON 기반 generic renderer로 전환**
   - DB JSON에 section/field를 추가하면 공개 화면이 자동 렌더링되어야 한다.
   - 현재처럼 `dress_code`, `rental`, `bath_shower` 등을 JSX에 하나씩 하드코딩하는 구조를 단계적으로 제거한다.

6. **예약 사이트처럼 보이는 UI 제거**
   - `예약 전 확인` 블록 제거.
   - 포함/불포함 정보가 있다면 한 번만 표시한다.

---

# 1. 현재 코드/DB에서 확인된 문제

## 1.1 `예약 전 확인`이 중복 표시됨

현재 파일:

- `src/components/inline-cms/IncludeExcludeSection.tsx`
- `src/app/[area]/golf/[id]/GolfDetailClient.tsx`
- `src/app/[area]/hotel/[id]/HotelDetailClient.tsx`
- `src/app/[area]/restaurant/[id]/RestaurantDetailClient.tsx`
- `src/components/inline-cms/index.ts`

`IncludeExcludeSection.tsx` 안에 다음 두 컴포넌트가 같이 있다.

- `IncludeExcludeSection`
- `IncludeExcludeSummary`

`IncludeExcludeSummary`는 이미 위에 표시된 포함/불포함 데이터를 다시 모아서 제목을 **`예약 전 확인`**으로 출력한다.

현재 DetailClient 3개가 모두 `IncludeExcludeSummary`를 사용한다.

이 사이트는 예약 사이트가 아니므로 이 요약은 제거한다.

### 즉시 수정 요구

- `GolfDetailClient.tsx`에서 `IncludeExcludeSummary` 사용 제거
- `HotelDetailClient.tsx`에서 제거
- `RestaurantDetailClient.tsx`에서 제거
- `src/components/inline-cms/index.ts` export 제거
- 다른 사용처가 없다면 `IncludeExcludeSummary` 구현 삭제
- **`IncludeExcludeSection` 자체는 당장 삭제하지 않는다.** JSON 전환 전까지 기존 포함/불포함 카드가 필요하다.

---

## 1.2 LabelManager가 하나 수정할 때마다 DB PUT을 실행함

현재 파일:

- `src/components/admin/LabelManager.tsx`

현재 동작:

- section visible toggle 클릭 → 즉시 PUT
- field active toggle 클릭 → 즉시 PUT
- label input `onBlur` → 즉시 PUT
- sort input `onBlur` → 즉시 PUT

관리자가 여러 항목을 수정할 때 DB write / revalidation이 계속 발생한다.

**최종 CMS V2에서는 이 패턴을 사용하지 않는다.**

편집 화면에서는 draft만 변경하고 마지막에 한 번 저장한다.

---

## 1.3 `scope_entity_type` 필터가 API에서 무시됨

현재 `LabelManager.tsx`는:

```ts
/api/admin/field-definitions?scope_entity_type=GOLF
```

형태로 요청한다.

그러나 현재:

- `src/app/api/admin/field-definitions/route.ts`
- `src/lib/crud/field-definitions.ts`

는 GET filter에서 `scope_entity_type`을 처리하지 않는다.

따라서 기존 LabelManager를 migration 기간 동안 유지할 경우 이 버그를 먼저 수정한다.

### 수정 예시

`src/lib/crud/field-definitions.ts`

```ts
export interface FieldDefinitionFilters {
  scope_type?: string;
  scope_entity_id?: string;
  scope_entity_type?: string;
  active_only?: boolean;
}
```

```ts
if (filters?.scope_entity_type) {
  query = query.eq(
    "scope_entity_type",
    filters.scope_entity_type.toUpperCase()
  );
}
```

`src/app/api/admin/field-definitions/route.ts`

```ts
const scope_entity_type =
  params.get("scope_entity_type") || undefined;

const definitions = await listFieldDefinitions({
  scope_type,
  scope_entity_id,
  scope_entity_type,
});
```

---

## 1.4 현재 공개 화면은 진짜 dynamic renderer가 아님

현재 예:

`src/app/[area]/golf/[id]/GolfDetailClient.tsx`

```tsx
{course.course_summary && sectionVisible("description") && (...)}
{course.play_cart && sectionVisible("play_cart") && (...)}
{course.clubhouse_dining && sectionVisible("clubhouse") && (...)}
{course.bath_shower && sectionVisible("bath_shower") && (...)}
{course.rental && sectionVisible("rental") && (...)}
{course.dress_code && sectionVisible("dress_code") && (...)}
```

DB에 새로운 `field_key` / `section_key`를 추가해도 JSX에 해당 코드가 없으면 공개 화면에는 나오지 않는다.

즉 현재 `field_definitions` / `section_definitions`는 **기존 하드코딩 필드의 label/visibility metadata 역할**만 하고 있으며, arbitrary field 추가 기능은 완전하게 구현되어 있지 않다.

CMS V2에서는 이 한계를 없애야 한다.

---

## 1.5 Section label과 Field label의 의미가 섞여 있음

예: 골프 공개 상세에서 단일 필드 section 제목에 `getFieldLabel()`을 쓰는 부분이 존재한다.

관리자가 section label을 바꿔도 공개 section 제목이 바뀌지 않을 수 있다.

CMS V2에서는 section label과 field label이 각 엔티티 JSON 안에 존재하므로 이 모호성을 제거한다.

---

## 1.6 LabelManager local state가 서버 canonical `updated_at`을 받지 않음

현재 `LabelManager.tsx`는 PUT 성공 후 서버에서 반환된 row를 쓰지 않고:

```ts
setSections((prev) =>
  prev.map((s) => (s.id === section.id ? { ...s, ...updates } : s))
);
```

처럼 local merge만 한다.

따라서 첫 PUT 후 DB의 `updated_at`이 바뀌어도 local state는 이전 `updated_at`을 들고 있을 수 있다. 같은 항목을 연속 수정하면 optimistic concurrency 409가 발생할 수 있다.

migration 기간 중 LabelManager를 유지한다면 반드시 server canonical response로 state를 교체한다.

예:

```ts
const response = await adminFetchJson<{
  success: true;
  data: SectionDef;
}>("/api/admin/section-definitions", {
  method: "PUT",
  body: JSON.stringify({
    id: section.id,
    updated_at: section.updated_at,
    ...updates,
  }),
});

const saved = response.data;

setSections((prev) =>
  prev.map((s) => (s.id === saved.id ? saved : s))
);
```

Field도 동일하다.

---

## 1.7 `restaurant_locations` query error handling — 현재 완료 상태

이 항목은 기존 P1 closure에서 누락이 확인됐지만, 현재 기준 SHA `b468b1d238ec0bb3c4254dc53b51ab381ee3e612`에서 이미 수정 완료됐다.

현재 파일:

- `src/lib/supabase-cms.ts`

public `getRestaurantById()`:

```ts
const { data: rawLocations, error: locationsError } = await db()
  .from("restaurant_locations")
  .select(/* ... */)
  .eq("restaurant_entity_id", entity.id)
  .order("sort");

if (locationsError) {
  logError("READ", "restaurant_locations", id, locationsError);
  throw locationsError;
}
```

admin `getRestaurantByEntityIdAdmin()`:

```ts
const { data: rawLocations, error: locationsError } = await adminDb()
  .from("restaurant_locations")
  .select(/* ... */)
  .eq("restaurant_entity_id", entity.id)
  .order("sort");

if (locationsError) {
  logError("READ_ADMIN", "restaurant_locations", entityId, locationsError);
  throw locationsError;
}
```

### Agent 규칙

- 이 코드를 다시 바꾸기 위한 별도 P1 작업을 만들지 않는다.
- CMS V2 리팩터링 중 해당 helper를 건드릴 경우 이 fail-loud 동작을 regression시키지 않는다.
- row 0개는 정상, query error만 throw한다.

## 1.8 P1 baseline은 닫고 CMS V2에 집중

현재 `P1_RESULT: COMPLETE`는 기준 상태로 취급한다.

CMS V2 작업에서 재검증은 가능하지만 다음을 반복 수행하는 것을 목표로 삼지 않는다.

- P1 visibility toggle 전체 재구현
- canonical CRUD 계약 재설계
- slug hardening 재작업
- restaurant location error handling 재작업

CMS V2는 그 위에 다음 새로운 구조를 올리는 작업이다.

- per-entity JSON details
- draft-only editor
- single-save transaction
- save progress UX
- generic renderer
- legacy dual-read/backfill/rollback


# 2. 최종 데이터 모델 원칙

## 2.1 전부 JSON으로 밀어 넣지 않는다

다음 정보는 relational/core로 유지한다.

`entities`:

- `id`
- `slug`
- `entity_type`
- `area_id`
- `display_name`
- `active`
- `sort`
- `category_id`
- `created_at`
- `updated_at`

검색/목록/관계/URL에 필요한 값은 기존 subtype table 또는 관계형 구조를 유지할 수 있다.

예:

- Golf: `official_name`, `address`, `phone`, `google_maps_url`
- Hotel: `official_name`, `address`, `address_jp`, `phone`, `google_maps_url`
- Restaurant: 목록에 필요한 `category`, `address`, `hours`, `price_range`, `phone`, `google_maps_url`

반대로 **엔티티마다 달라지는 상세 section / label / custom field / 표시 여부 / 순서 / custom value**를 `details_json`으로 이동한다.

---

## 2.2 `entities.details_json JSONB` 추가

### Migration

**Migration 파일 이름을 임의로 만들지 말 것.**

먼저:

```bash
supabase migration new cms_entity_details_json_v1
```

로 생성한다.

초기 SQL 예시:

```sql
alter table public.entities
add column if not exists details_json jsonb
not null
 default '{"version":1,"sections":[]}'::jsonb;

alter table public.entities
add constraint entities_details_json_object_check
check (jsonb_typeof(details_json) = 'object');
```

이미 동일 constraint가 있는지 먼저 확인한다.

### Index

초기에는 GIN index를 추가하지 않는다.

이유:

- 현재 JSON은 `entity.id/slug`로 row를 찾은 뒤 렌더링한다.
- JSON 내부를 대규모 검색하는 요구가 아직 없다.
- 필요 없는 GIN index는 write cost만 늘린다.

검색 요구가 실제로 생길 때 별도 검토한다.

---

# 3. JSON 문서 구조

## 3.1 TypeScript 타입

신규 파일 권장:

`src/lib/entity-details/types.ts`

```ts
export type EntityDetailsVersion = 1;

export type DetailFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "url"
  | "list";

export interface EntityDetailField {
  id: string;
  key: string;
  label: string;
  labelJa?: string | null;
  type: DetailFieldType;
  value: string | number | boolean | string[] | null;
  visible: boolean;
  sort: number;
}

export interface EntityDetailSection {
  id: string;
  key: string;
  label: string;
  labelJa?: string | null;
  emoji?: string | null;
  visible: boolean;
  sort: number;
  fields: EntityDetailField[];
}

export interface EntityDetailsDocumentV1 {
  version: 1;
  sections: EntityDetailSection[];
}

export type EntityDetailsDocument = EntityDetailsDocumentV1;
```

### 핵심 의미

`sections`:

- 엔티티별 자유로운 상세 content.
- label + value 모두 JSON에 저장.
- 새 항목을 추가해도 새 DB column 불필요.

---

## 3.2 Golf JSON 예시

```json
{
  "version": 1,
  "sections": [
    {
      "id": "golf-course-guide",
      "key": "course-guide",
      "label": "코스 안내",
      "labelJa": "コース案内",
      "visible": true,
      "sort": 100,
      "fields": [
        {
          "id": "course-summary",
          "key": "course_summary",
          "label": "코스 특징",
          "type": "textarea",
          "value": "18홀, 페어웨이가 넓은 편",
          "visible": true,
          "sort": 10
        }
      ]
    },
    {
      "id": "golf-facilities",
      "key": "facilities",
      "label": "시설 안내",
      "visible": true,
      "sort": 200,
      "fields": [
        {
          "id": "bath",
          "key": "bath_shower",
          "label": "목욕/샤워",
          "type": "textarea",
          "value": "남녀 락커 및 목욕시설 있음",
          "visible": true,
          "sort": 10
        },
        {
          "id": "rental",
          "key": "rental",
          "label": "렌탈 골프채",
          "type": "text",
          "value": "사전 문의",
          "visible": true,
          "sort": 20
        },
        {
          "id": "dress-code",
          "key": "dress_code",
          "label": "복장",
          "type": "textarea",
          "value": "클럽하우스 복장 규정 확인 필요",
          "visible": true,
          "sort": 30
        }
      ]
    },
    {
      "id": "include-exclude",
      "key": "include-exclude",
      "label": "포함 / 불포함",
      "visible": true,
      "sort": 300,
      "fields": [
        {
          "id": "included-items",
          "key": "included_items",
          "label": "포함사항",
          "type": "list",
          "value": ["test"],
          "visible": true,
          "sort": 10
        },
        {
          "id": "excluded-items",
          "key": "excluded_items",
          "label": "불포함사항",
          "type": "list",
          "value": ["test1"],
          "visible": true,
          "sort": 20
        }
      ]
    }
  ]
}
```

**`예약 전 확인` section은 만들지 않는다.**

---

# 4. JSON runtime validation 필수

TypeScript type만 믿지 말고 API boundary에서 실제 JSON structure를 검증한다.

P2에서 전체 Zod 도입을 별도로 하더라도, `details_json`은 관리자 입력 JSON이므로 최소 validation을 반드시 한다.

신규 파일 권장:

`src/lib/entity-details/validate.ts`

예시:

```ts
import type {
  EntityDetailField,
  EntityDetailSection,
  EntityDetailsDocumentV1,
} from "./types";

const MAX_SECTIONS = 50;
const MAX_FIELDS_PER_SECTION = 50;
const MAX_LABEL_LENGTH = 100;
const MAX_TEXT_LENGTH = 20_000;
const MAX_LIST_ITEMS = 100;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateField(value: unknown): EntityDetailField {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid detail field");
  }

  const field = value as Record<string, unknown>;

  if (!isNonEmptyString(field.id)) throw new Error("Field id is required");
  if (!isNonEmptyString(field.key)) throw new Error("Field key is required");
  if (!isNonEmptyString(field.label)) throw new Error("Field label is required");

  if ((field.label as string).length > MAX_LABEL_LENGTH) {
    throw new Error("Field label is too long");
  }

  const allowedTypes = new Set([
    "text",
    "textarea",
    "number",
    "boolean",
    "url",
    "list",
  ]);

  if (!allowedTypes.has(String(field.type))) {
    throw new Error(`Unsupported field type: ${String(field.type)}`);
  }

  if (field.type === "list") {
    if (!Array.isArray(field.value)) {
      throw new Error("List field value must be an array");
    }
    if (field.value.length > MAX_LIST_ITEMS) {
      throw new Error("Too many list items");
    }
  }

  if (
    typeof field.value === "string" &&
    field.value.length > MAX_TEXT_LENGTH
  ) {
    throw new Error("Field value is too long");
  }

  return field as unknown as EntityDetailField;
}

function validateSection(value: unknown): EntityDetailSection {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid detail section");
  }

  const section = value as Record<string, unknown>;

  if (!isNonEmptyString(section.id)) throw new Error("Section id is required");
  if (!isNonEmptyString(section.key)) throw new Error("Section key is required");
  if (!isNonEmptyString(section.label)) throw new Error("Section label is required");
  if (!Array.isArray(section.fields)) throw new Error("Section fields must be an array");

  if (section.fields.length > MAX_FIELDS_PER_SECTION) {
    throw new Error("Too many fields in a section");
  }

  const fields = section.fields.map(validateField);

  const ids = new Set<string>();
  for (const field of fields) {
    if (ids.has(field.id)) throw new Error(`Duplicate field id: ${field.id}`);
    ids.add(field.id);
  }

  return {
    ...(section as unknown as EntityDetailSection),
    fields,
  };
}

export function parseEntityDetailsDocument(
  input: unknown
): EntityDetailsDocumentV1 {
  if (!input || typeof input !== "object") {
    throw new Error("details must be an object");
  }

  const obj = input as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error("Unsupported details schema version");
  }

  if (!Array.isArray(obj.sections)) {
    throw new Error("sections must be an array");
  }

  if (obj.sections.length > MAX_SECTIONS) {
    throw new Error("Too many sections");
  }

  const sections = obj.sections.map(validateSection);

  return {
    version: 1,
    sections,
  };
}
```

### 보안

- raw HTML field type 추가 금지.
- React renderer에서 `dangerouslySetInnerHTML` 사용 금지.
- URL field는 `http:` / `https:` protocol만 허용.
- service role key는 Client에 노출 금지.

---

# 5. 편집 UX — Draft 기반 단일 저장

## 5.1 공통 editor state

신규 hook 권장:

`src/hooks/use-entity-editor-draft.ts`

```ts
import { useMemo, useState } from "react";

export type SaveStage =
  | "idle"
  | "validating"
  | "sending"
  | "saving"
  | "refreshing"
  | "done"
  | "error";

export function useEntityEditorDraft<T>(initialValue: T) {
  const [original, setOriginal] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [saveStage, setSaveStage] = useState<SaveStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(original) !== JSON.stringify(draft),
    [original, draft]
  );

  function acceptCanonical(saved: T) {
    setOriginal(saved);
    setDraft(saved);
    setError(null);
  }

  function resetDraft() {
    setDraft(original);
    setError(null);
  }

  return {
    original,
    draft,
    setDraft,
    isDirty,
    saveStage,
    setSaveStage,
    error,
    setError,
    acceptCanonical,
    resetDraft,
  };
}
```

실제 변경 개수는 JSON diff helper를 별도로 만들어 계산한다.

신규 파일 권장:

- `src/lib/entity-details/diff.ts`

---

## 5.2 저장 progress UI

중요: 가짜 10%, 50%, 90% 퍼센트를 만들지 않는다.

한 번의 HTTP request 내부에서 정확히 "DB transaction 시작/종료"를 브라우저가 알 수 없으므로 step 기반으로 표현한다.

권장 단계:

1. 입력값 확인 중
2. 서버로 수정사항 전달 중
3. DB 저장 및 공개 페이지 갱신 중
4. 화면 동기화 중
5. 저장 완료

신규 컴포넌트:

`src/components/inline-cms/SaveProgress.tsx`

```tsx
"use client";

import type { SaveStage } from "@/hooks/use-entity-editor-draft";

const STEPS: Array<{
  stage: SaveStage;
  label: string;
}> = [
  { stage: "validating", label: "입력값 확인 중" },
  { stage: "sending", label: "서버로 수정사항 전달 중" },
  { stage: "saving", label: "DB 저장 및 공개 페이지 갱신 중" },
  { stage: "refreshing", label: "화면 동기화 중" },
  { stage: "done", label: "저장 완료" },
];

export function SaveProgress({ stage }: { stage: SaveStage }) {
  if (stage === "idle") return null;

  const currentIndex = STEPS.findIndex((s) => s.stage === stage);

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <div className="space-y-2">
        {STEPS.map((step, index) => {
          const complete = currentIndex > index || stage === "done";
          const current = currentIndex === index;

          return (
            <div key={step.stage} className="flex items-center gap-2 text-[13px]">
              <span>{complete ? "✓" : current ? "●" : "○"}</span>
              <span className={current ? "font-medium text-text" : "text-muted"}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 5.3 저장 함수 예시

```ts
async function handleSave() {
  if (!editor.isDirty) return;

  editor.setError(null);
  editor.setSaveStage("validating");

  try {
    const payload = buildEntityEditorPayload(editor.draft);
    validateEditorPayload(payload);

    editor.setSaveStage("sending");

    const request = fetch("/api/admin/entity-editor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 요청이 서버에서 처리되는 동안 표시할 broad stage.
    editor.setSaveStage("saving");

    const response = await request;
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || `저장 실패 (${response.status})`);
    }

    if (!body.data?.entity || !body.data?.details) {
      throw new Error("Canonical response가 없습니다.");
    }

    editor.setSaveStage("refreshing");

    const canonical = mapEditorResponse(body.data);
    editor.acceptCanonical(canonical);

    router.refresh();

    editor.setSaveStage("done");
  } catch (err) {
    editor.setError(
      err instanceof Error ? err.message : "저장 중 오류가 발생했습니다."
    );
    editor.setSaveStage("error");
  }
}
```

### 실패 UX

- Modal/editor를 자동으로 닫지 않는다.
- draft 유지.
- 저장 버튼을 `다시 시도` 가능 상태로 되돌린다.
- server error message는 안전 메시지 사용.
- 내부 error detail은 server log에만 기록.

---

# 6. 공통 Entity Detail Editor

신규 컴포넌트 권장:

- `src/components/inline-cms/EntityDetailsEditor.tsx`
- `src/components/inline-cms/EntitySectionEditor.tsx`
- `src/components/inline-cms/EntityFieldEditor.tsx`
- `src/components/inline-cms/SaveProgress.tsx`

기능:

- section label 수정
- section visible toggle
- section 위/아래 이동 또는 drag sort
- section 추가
- section 삭제
- field label 수정
- field value 수정
- field type 선택
- field visible toggle
- field 순서 변경
- field 추가/삭제
- list field item 추가/삭제
- 저장되지 않은 변경사항 count
- 한 번에 저장

### ID 생성

Client에서 신규 section / field ID는:

```ts
const id = crypto.randomUUID();
```

사용 가능.

DB primary key가 아니라 JSON 내부 stable ID이다.

---

# 7. 공개 Generic Renderer

신규 컴포넌트:

`src/components/entity-details/EntityDetailsRenderer.tsx`

```tsx
import type {
  EntityDetailsDocument,
  EntityDetailField,
} from "@/lib/entity-details/types";

interface Props {
  details: EntityDetailsDocument;
}

function FieldValue({ field }: { field: EntityDetailField }) {
  if (field.type === "boolean") {
    return <span>{field.value === true ? "✓" : "✗"}</span>;
  }

  if (field.type === "list") {
    const items = Array.isArray(field.value) ? field.value : [];
    return (
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`${field.id}-${index}`} className="text-[15px] text-text">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (field.type === "url") {
    const href = typeof field.value === "string" ? field.value : "";
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline"
      >
        {field.label}
      </a>
    );
  }

  if (field.value === null || field.value === "") return null;

  return (
    <p className="text-[15px] text-text whitespace-pre-wrap">
      {String(field.value)}
    </p>
  );
}

export function EntityDetailsRenderer({ details }: Props) {
  const sections = [...details.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.sort - b.sort);

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const fields = [...section.fields]
          .filter((field) => field.visible)
          .sort((a, b) => a.sort - b.sort);

        if (fields.length === 0) return null;

        return (
          <section
            key={section.id}
            className="bg-surface border border-border rounded-[12px] p-4"
          >
            <h2 className="text-[16px] font-bold text-text mb-3">
              {section.emoji ? `${section.emoji} ` : ""}
              {section.label}
            </h2>

            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id}>
                  {field.label && field.type !== "url" && (
                    <div className="text-[13px] text-muted mb-1">
                      {field.label}
                    </div>
                  )}
                  <FieldValue field={field} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

실제 스타일은 현재 디자인 시스템에 맞춰 조정한다.

---

# 8. 기존 hardcoded DetailClient를 단계적으로 교체

수정 대상:

- `src/app/[area]/golf/[id]/GolfDetailClient.tsx`
- `src/app/[area]/hotel/[id]/HotelDetailClient.tsx`
- `src/app/[area]/restaurant/[id]/RestaurantDetailClient.tsx`
- `src/app/[area]/attraction/[slug]/AttractionDetailClient.tsx`

## 전환 원칙

1. 제목 / breadcrumb / delete toolbar 등 페이지 identity는 기존 유지.
2. core relational fields는 필요한 경우 별도 `CoreInfoRenderer`로 렌더.
3. variable detail blocks는 `EntityDetailsRenderer` 사용.
4. JSON이 아직 비어 있는 legacy row는 기존 hardcoded renderer fallback을 임시 지원.
5. backfill 완료 후 legacy fallback 제거.

예:

```tsx
const hasJsonDetails =
  entity.details?.version === 1 &&
  entity.details.sections.length > 0;

return (
  <>
    <EntityIdentityHeader entity={entity} />

    <EntityCoreInfoRenderer
      entity={entity}
    />

    {hasJsonDetails ? (
      <EntityDetailsRenderer details={entity.details} />
    ) : (
      <LegacyGolfDetails course={course} />
    )}
  </>
);
```

---

# 9. 기존 포함/불포함 + 추가 안내를 JSON으로 통합

현재 별도 테이블:

- `includes_excludes` — FK: `parent_entity_id` (실제 컬럼명). `parent_type`/`parent_id` 컬럼은 존재하지 않음. 추가 컬럼: `legacy_id`, `type`, `text_kr`, `text_jp`, `sort`, `is_visible`, `created_at`, `updated_at`.
- `content_sections` — FK: `parent_entity_id` (실제 컬럼명). 추가 컬럼: `legacy_id`, `title`, `content`, `emoji`, `sort`, `is_visible`, `created_at`, `updated_at`.

현재 별도 API:

- `src/app/api/admin/includes/route.ts`
- `src/app/api/admin/content-sections/route.ts`

현재 Client:

- `IncludeExcludeSection.tsx`
- `ContentSectionsRenderer.tsx`

최종 CMS V2에서는 이 데이터를 `details_json.sections`로 병합한다.

## migration 기간

- 즉시 table/API 삭제 금지.
- 먼저 JSON backfill.
- public renderer JSON 우선.
- admin editor JSON 우선.
- QA 후 old write route를 사용하지 않도록 UI에서 제거.
- DB table drop은 별도 후속 migration에서만 검토.

---

# 10. Global LabelManager의 최종 역할

사용자 요구는 **개별 엔티티 관리**이다.

따라서 다음은 최종 public detail source-of-truth가 아니어야 한다.

- `section_definitions`
- `field_definitions`
- `LabelManager`

### 정책

- 기존 데이터 backfill/default 생성 용도로는 사용할 수 있다.
- migration 동안 legacy 화면을 위해 유지 가능.
- 신규 CMS V2 editor에서는 각 entity의 `details_json`이 label/visible/sort source-of-truth.

### Admin nav

현재:

`src/app/admin/[area]/page.tsx`

에 `/admin/${area}/labels` 링크가 있다.

CMS V2가 Production에서 안정화되면:

- `🏷 라벨 / 섹션 관리` 링크 제거 또는 Legacy 관리로 명확히 표시.
- 일반 관리자는 각 골프장/호텔/식당/볼거리 수정 화면에서 직접 개별 라벨을 편집.

기존 route/API/table는 즉시 drop하지 않는다.

---

# 11. 저장 API 설계

신규 Route 권장:

`src/app/api/admin/entity-editor/route.ts`

## Payload

신규 타입:

`src/lib/entity-details/contracts.ts`

```ts
import type { EntityDetailsDocument } from "./types";

export interface EntityEditorSavePayload {
  entityId: string;
  entityType: "GOLF" | "HOTEL" | "RESTAURANT" | "ATTRACTION";
  expectedUpdatedAt: string;
  core: Record<string, unknown>;
  details: EntityDetailsDocument;
}
```

### Route 예시

```ts
import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  badRequest,
  conflict,
  ok,
  serverError,
  unauthorized,
} from "@/lib/crud/response";
import { parseEntityDetailsDocument } from "@/lib/entity-details/validate";
import { saveEntityEditor } from "@/lib/entity-editor/save";

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await req.json();

    if (!body?.entityId || !body?.entityType || !body?.expectedUpdatedAt) {
      return badRequest("필수 저장 정보가 없습니다.");
    }

    const details = parseEntityDetailsDocument(body.details);

    const result = await saveEntityEditor({
      entityId: body.entityId,
      entityType: body.entityType,
      expectedUpdatedAt: body.expectedUpdatedAt,
      core: body.core ?? {},
      details,
    });

    return ok(result);
  } catch (err) {
    if (err instanceof EntityEditorConflictError) {
      return conflict(err.message);
    }

    return serverError(err);
  }
}
```

---

# 12. 저장은 atomic transaction으로 처리

JSON 저장만 성공하고 core update가 실패하거나, 반대로 core만 바뀌고 JSON 저장이 실패하면 안 된다.

따라서 최종 save는 DB transaction으로 처리한다.

권장:

- `admin_save_entity_editor_v1` PostgreSQL RPC
- `SECURITY DEFINER` 사용 시 실행 권한을 반드시 `postgres`, `service_role`에만 제한
- `anon`, `authenticated`, `PUBLIC` execute revoke
- `search_path` 고정

## SQL skeleton

**주의: `entities` 테이블에는 `set_entities_updated_at` BEFORE UPDATE trigger가 이미 존재한다.** RPC에서 별도로 `updated_at = now()`를 설정하지 않는다. trigger가 자동으로 갱신한다. 중복 timestamp logic을 만들지 마라.

**실제 migration은 `supabase migration new ...`로 생성한다.**

```sql
create or replace function public.admin_save_entity_editor_v1(
  p_entity_id uuid,
  p_expected_updated_at timestamptz,
  p_core jsonb,
  p_details jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_updated_at timestamptz;
begin
  -- 1. entity_type 확인 (lock 불필요)
  select entity_type
    into v_type
  from public.entities
  where id = p_entity_id;

  if not found then
    raise exception 'ENTITY_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  -- 2. atomic UPDATE with optimistic concurrency
  update public.entities
  set
    display_name = coalesce(p_core->>'display_name', display_name),
    active = case
      when p_core ? 'active' then (p_core->>'active')::boolean
      else active
    end,
    sort = case
      when p_core ? 'sort' then (p_core->>'sort')::integer
      else sort
    end,
    details_json = p_details
  where id = p_entity_id
    and (p_expected_updated_at is null or updated_at = p_expected_updated_at)
  returning updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'STALE_VERSION'
      using errcode = 'P0001';
  end if;

  if v_type = 'GOLF' then
    update public.golf_courses
    set
      official_name = coalesce(p_core->>'official_name', official_name),
      address = coalesce(p_core->>'address', address),
      phone = coalesce(p_core->>'phone', phone),
      google_maps_url = coalesce(p_core->>'google_maps_url', google_maps_url)
    where entity_id = p_entity_id;

    if not found then
      raise exception 'GOLF_CHILD_NOT_FOUND'
        using errcode = 'P0002';
    end if;

  elsif v_type = 'HOTEL' then
    update public.hotels
    set
      official_name = coalesce(p_core->>'official_name', official_name),
      address = coalesce(p_core->>'address', address),
      address_jp = coalesce(p_core->>'address_jp', address_jp),
      phone = coalesce(p_core->>'phone', phone),
      google_maps_url = coalesce(p_core->>'google_maps_url', google_maps_url)
    where entity_id = p_entity_id;

    if not found then
      raise exception 'HOTEL_CHILD_NOT_FOUND'
        using errcode = 'P0002';
    end if;

  elsif v_type = 'RESTAURANT' then
    update public.restaurants
    set
      category = coalesce(p_core->>'category', category),
      address = coalesce(p_core->>'address', address),
      hours = coalesce(p_core->>'hours', hours),
      price_range = coalesce(p_core->>'price_range', price_range),
      phone = coalesce(p_core->>'phone', phone),
      google_maps_url = coalesce(p_core->>'google_maps_url', google_maps_url)
    where entity_id = p_entity_id;

    if not found then
      raise exception 'RESTAURANT_CHILD_NOT_FOUND'
        using errcode = 'P0002';
    end if;

  elsif v_type = 'ATTRACTION' then
    -- ATTRACTION은 현재 dedicated child table이 없음.
    -- display_name 외 상세값은 details_json으로 이전하는 방향.
    null;

  else
    raise exception 'UNSUPPORTED_ENTITY_TYPE: %', v_type;
  end if;

  return jsonb_build_object(
    'id', p_entity_id,
    'entity_type', v_type,
    'details', p_details
  );
end;
$$;

revoke all on function public.admin_save_entity_editor_v1(
  uuid,
  timestamptz,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.admin_save_entity_editor_v1(
  uuid,
  timestamptz,
  jsonb,
  jsonb
) to postgres, service_role;
```

### 주의

위 SQL은 skeleton이다. 실제 current schema와 nullable semantics를 확인해서:

- 빈 문자열을 null로 만들지 여부
- boolean/string 변환
- 필수값
- updated_at 반환
- area 변경 지원 여부

를 명확히 해야 한다.

---

# 13. Server save wrapper

신규 파일 권장:

`src/lib/entity-editor/save.ts`

```ts
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { EntityEditorSavePayload } from "@/lib/entity-details/contracts";
import { getCanonicalEntityEditor } from "./read";

export class EntityEditorConflictError extends Error {}

export async function saveEntityEditor(
  payload: EntityEditorSavePayload
) {
  const db = getSupabaseAdmin();

  const { error } = await db.rpc("admin_save_entity_editor_v1", {
    p_entity_id: payload.entityId,
    p_expected_updated_at: payload.expectedUpdatedAt,
    p_core: payload.core,
    p_details: payload.details,
  });

  if (error) {
    if (error.code === "P0001" && error.message.includes("STALE_VERSION")) {
      throw new EntityEditorConflictError(
        "다른 수정사항이 먼저 저장되었습니다. 최신 데이터를 다시 불러와 주세요."
      );
    }
    throw error;
  }

  const canonical = await getCanonicalEntityEditor(payload.entityId);
  if (!canonical) {
    throw new Error("Canonical read failed after save");
  }

  return canonical;
}
```

성공 response는 request echo가 아니라 반드시 DB canonical read 결과여야 한다.

---

# 14. Canonical editor read

신규 파일 권장:

`src/lib/entity-editor/read.ts`

반환 예:

```ts
export interface EntityEditorCanonical {
  entity: {
    id: string;
    slug: string;
    entityType: "GOLF" | "HOTEL" | "RESTAURANT" | "ATTRACTION";
    displayName: string;
    active: boolean;
    sort: number;
    updatedAt: string;
  };
  core: Record<string, unknown>;
  details: EntityDetailsDocument;
}
```

Admin read는 `getSupabaseAdmin()`을 사용하고 inactive row도 읽을 수 있어야 한다.

---

# 15. Revalidation

저장 성공 후 관련 public detail/list를 revalidate한다.

기존:

- `src/lib/revalidate-labels.ts`

의 아이디어를 재사용하되 entity save에서는 특정 entity만 revalidate하는 helper를 따로 만드는 편이 효율적이다.

신규 권장:

`src/lib/revalidate-entity.ts`

```ts
import { revalidatePath } from "next/cache";

const PATHS = {
  GOLF: "golf",
  HOTEL: "hotel",
  RESTAURANT: "restaurant",
  ATTRACTION: "attraction",
} as const;

export function revalidateEntityDetail(args: {
  entityType: keyof typeof PATHS;
  area: string;
  slug: string;
}) {
  const segment = PATHS[args.entityType];
  const area = args.area.toLowerCase();

  revalidatePath(`/${area}/${segment}`);
  revalidatePath(`/${area}/${segment}/${args.slug}`);
}
```

모든 entity row를 매번 순회해서 revalidate하지 않는다.

---

# 16. 기존 데이터 Backfill

## 16.1 절대 destructive migration부터 하지 말 것

순서:

1. `details_json` column 추가
2. existing rows backfill
3. JSON public read 추가 + legacy fallback
4. Admin JSON editor 추가
5. Production QA
6. JSON을 source-of-truth로 전환
7. Legacy writes 중단
8. 충분한 기간 후 legacy columns/tables 정리 여부 별도 결정

기존 컬럼/table은 당장 DROP하지 않는다.

---

## 16.2 Golf backfill mapping

기존 columns:

- `course_summary`
- `play_cart`
- `clubhouse_dining`
- `bath_shower`
- `rental`
- `dress_code`

→ `details_json.sections`로 변환.

## 16.3 Hotel backfill mapping

가변 detail 후보:

- `checkin_time`
- `checkout_time`
- `breakfast_summary`
- `breakfast_place`
- `breakfast_time`
- `breakfast_last_entry`
- `dinner_summary`
- `dinner_place`
- `dinner_time`
- `dinner_last_entry`
- `bath_spa_summary`
- `has_public_bath`
- `has_outdoor_onsen`
- `has_sauna`
- `bath_spa_hours`
- `tattoo_policy`
- `atm_payment`
- `transport_note`
- `other_info`

검색/목록에 쓰지 않는 상세 정보는 JSON으로 옮긴다.

## 16.4 Restaurant backfill mapping

**주의: 실제 DB 컬럼 기준 (2026-09-22 확인)**

`restaurants` 테이블에는 다음 컬럼이 **존재하지 않는다**: `name_kr`, `name_jp`, `near_type`, `near_id`, `distance_km`, `drive_minutes`, `walk_minutes`.

현재 매핑:

- Korean display name → `entities.display_name`
- Japanese name → `entity_field_values` (field_key: `rest_name_jp`)
- near/distance → `restaurant_locations` 관계 테이블

후보:

- `menu_kr`
- `menu_jp`
- `menu_price`
- `closed_days`
- `description`
- `recommended`
- 거리 표시 정보

`hours`, `price_range` 등 목록에 쓰는 필드는 초기에는 relational core로 유지 가능.

## 16.5 Attraction backfill

현재 Attraction은 dedicated table이 없고 EAV 기반이다.

현재 EAV keys:

- `name_jp`
- `address_kr`
- `address_jp`
- `phone`
- `google_maps_url`
- `hours`
- `closed_days`
- `admission_fee`
- `recommended_duration`
- `parking_info`
- `description`
- `other_info`

CMS V2에서는:

- `display_name`, `active`, `sort`, area, slug는 `entities`
- 나머지는 `details_json` 중심으로 전환 가능

migration 기간에는 EAV fallback read를 유지한다.

---

# 17. Backfill helper 예시

신규 서버-only helper:

`src/lib/entity-details/legacy-to-json.ts`

```ts
import type { EntityDetailsDocumentV1 } from "./types";
import type { GolfCourse } from "@/lib/types";

export function buildGolfDetailsFromLegacy(
  golf: GolfCourse
): EntityDetailsDocumentV1 {
  return {
    version: 1,
    sections: [
      {
        id: "legacy-course-summary",
        key: "description",
        label: "골프장 설명",
        visible: Boolean(golf.course_summary),
        sort: 100,
        fields: [
          {
            id: "legacy-course-summary-field",
            key: "course_summary",
            label: "골프장 설명",
            type: "textarea",
            value: golf.course_summary || "",
            visible: Boolean(golf.course_summary),
            sort: 10,
          },
        ],
      },
      // play_cart / clubhouse / bath / rental / dress_code 동일 패턴
    ],
  };
}
```

Backfill은 idempotent 해야 한다.

이미 `details_json.version === 1`이며 sections가 존재하는 row는 덮어쓰지 않는다.

---

# 18. 기존 4개 EditModal 전환

현재:

- `src/components/inline-cms/GolfEditModal.tsx`
- `src/components/inline-cms/HotelEditModal.tsx`
- `src/components/inline-cms/RestaurantEditModal.tsx`
- `src/components/inline-cms/AttractionEditModal.tsx`

현재 Golf/Hotel/Restaurant은 이미 form state → 한 번 저장 구조에 가깝다.

그러므로 이 장점을 유지하고 JSON section editor를 합친다.

### 권장 구조

```tsx
<EntityEditorShell>
  <CoreFieldsEditor />
  <EntityDetailsEditor />
  <UnsavedChangesBar />
  <SaveProgress />
</EntityEditorShell>
```

각 엔티티 별로 완전히 다른 modal을 계속 확장하지 말고 공통 editor shell을 만든다.

---

# 19. Unsaved changes UX

예:

```tsx
{isDirty && (
  <div className="sticky bottom-0 border-t border-border bg-white p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted">
        저장되지 않은 변경사항 {changeCount}개
      </span>

      <div className="flex gap-2">
        <button onClick={resetDraft}>변경 취소</button>
        <button onClick={handleSave}>변경사항 저장</button>
      </div>
    </div>
  </div>
)}
```

### Modal 닫기 보호

`isDirty === true`인 상태에서 닫기/뒤로가기를 누르면 confirm을 보여준다.

문구 예:

`저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 닫으시겠습니까?`

---

# 20. 새 section / field 추가 UX

예:

```text
[시설 안내]                  [숨김] [↑] [↓] [삭제]
섹션 이름   [시설 안내________________]

목욕/샤워   [남녀 락커 및 목욕시설 있음________]
렌탈 골프채 [사전 문의________________________]

[+ 항목 추가]

[+ 섹션 추가]
```

새 필드 추가 modal:

- 라벨
- 타입
- 기본값/내용
- 표시 여부

field key는 관리자에게 필수 노출하지 않아도 된다.

내부 key는 label과 별개로 stable ID 기반 생성 가능:

```ts
function makeCustomFieldKey() {
  return `custom_${crypto.randomUUID()}`;
}
```

label을 변경해도 key는 바꾸지 않는다.

---

# 21. Attraction도 동일 editor 사용

현재:

`src/components/inline-cms/AttractionEditModal.tsx`

는 라벨/필드가 전부 하드코딩되어 있다.

CMS V2에서는 Attraction도 같은 `EntityDetailsEditor`를 사용한다.

기존 EAV 값은 JSON backfill 후 fallback만 유지한다.

---

# 22. 현재 API 응답 echo 금지

특히 Attraction route 현재는 canonical DB re-read가 아니라 request body echo 성격이 강하다.

파일:

- `src/app/api/admin/attraction/route.ts`

CMS V2 save API는 반드시:

1. DB transaction save
2. DB canonical re-read
3. canonical response

순서여야 한다.

Client가 request body를 성공값으로 추정해서 state에 합치면 안 된다.

---

# 23. Global `field_definitions` / `section_definitions`는 즉시 삭제 금지

기존 시스템 곳곳에서 사용 중이다.

최종 방향은 entity JSON이지만 transition 동안:

- legacy fallback
- backfill default label source
- old admin compatibility

용도로 유지할 수 있다.

Production 전환 완료 전 table/drop migration 금지.

---

# 24. Migration Feature Flag / Dual Read

대규모 전환 중 한 번에 모든 public detail을 바꾸지 않는다.

권장 helper:

```ts
export function hasEntityDetailsV1(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.sections);
}
```

Public read:

```ts
if (hasEntityDetailsV1(entity.details_json)) {
  return renderJsonDetails();
}

return renderLegacyDetails();
```

모든 production row backfill + QA 후 fallback 제거.

---

# 25. 타입별 Rollout 순서

## Phase 0 — 현재 CMS 버그 마감

- `예약 전 확인` 제거
- field definition entity type filter 수정
- LabelManager canonical `updated_at` 반영
- 기존 label persistence 문제 실제 재현/QA
- Golf public section heading의 section/field label source 혼용 audit 및 최소 수정
- `restaurant_locations` error handling은 `b468b1d`에서 완료된 상태를 regression check만 수행
- 기존 P1 QA 문서에 `(uncommitted)` 같은 stale wording이 남아 있으면 실제 commit `b468b1d`로 교정

## Phase 1 — DB + type foundation

- `entities.details_json` migration
- TS types
- validation
- canonical read helper
- entity save RPC skeleton

## Phase 2 — Golf pilot

- 기존 Golf row backfill
- Golf editor JSON section UI
- Golf public generic renderer
- legacy fallback
- Production QA

## Phase 3 — Hotel

- backfill
- editor
- renderer
- QA

## Phase 4 — Restaurant

- backfill
- location relation은 relational 유지
- editor
- renderer
- QA

## Phase 5 — Attraction

- EAV → details_json backfill
- editor
- list/detail dual read
- QA

## Phase 6 — Legacy UI retirement

- global LabelManager nav 제거/Legacy 표시
- old ContentSections/Includes inline editing 제거
- old APIs unused 확인
- table drop은 별도 승인 없이는 하지 않음

---

# 26. 수정/신규 파일 전체 체크리스트

## 즉시 수정

- `src/components/inline-cms/IncludeExcludeSection.tsx`
- `src/components/inline-cms/index.ts`
- `src/app/[area]/golf/[id]/GolfDetailClient.tsx`
- `src/app/[area]/hotel/[id]/HotelDetailClient.tsx`
- `src/app/[area]/restaurant/[id]/RestaurantDetailClient.tsx`
- `src/app/api/admin/field-definitions/route.ts`
- `src/lib/crud/field-definitions.ts`
- `src/components/admin/LabelManager.tsx`
- `src/lib/supabase-cms.ts` — CMS V2 read/save/backfill 작업 대상. `restaurant_locations` P1 fix는 이미 완료 상태이므로 유지할 것.

## 신규 기반 코드

- `src/lib/entity-details/types.ts`
- `src/lib/entity-details/contracts.ts`
- `src/lib/entity-details/validate.ts`
- `src/lib/entity-details/diff.ts`
- `src/lib/entity-details/legacy-to-json.ts`
- `src/lib/entity-editor/read.ts`
- `src/lib/entity-editor/save.ts`
- `src/lib/revalidate-entity.ts`
- `src/hooks/use-entity-editor-draft.ts`
- `src/components/inline-cms/EntityDetailsEditor.tsx`
- `src/components/inline-cms/EntitySectionEditor.tsx`
- `src/components/inline-cms/EntityFieldEditor.tsx`
- `src/components/inline-cms/SaveProgress.tsx`
- `src/components/entity-details/EntityDetailsRenderer.tsx`
- `src/components/entity-details/EntityCoreInfoRenderer.tsx`
- `src/app/api/admin/entity-editor/route.ts`

## 단계적 수정

- `src/components/inline-cms/GolfEditModal.tsx`
- `src/components/inline-cms/HotelEditModal.tsx`
- `src/components/inline-cms/RestaurantEditModal.tsx`
- `src/components/inline-cms/AttractionEditModal.tsx`
- `src/app/[area]/attraction/[slug]/AttractionDetailClient.tsx`
- `src/app/[area]/attraction/[slug]/page.tsx`
- `src/app/[area]/attraction/AttractionListClient.tsx`
- `src/app/api/admin/attraction/route.ts`
- `src/components/inline-cms/ContentSectionsRenderer.tsx`
- `src/app/api/admin/content-sections/route.ts`
- `src/app/api/admin/includes/route.ts`
- `src/app/admin/[area]/page.tsx`
- `src/app/admin/[area]/labels/page.tsx`

---

# 27. DB migration TODO

- [ ] `entities.details_json jsonb` 추가
- [ ] JSON object check constraint
- [ ] migration history 정상 확인
- [ ] RPC `admin_save_entity_editor_v1` 생성
- [ ] RPC `search_path` 고정
- [ ] `PUBLIC/anon/authenticated EXECUTE` revoke
- [ ] `postgres/service_role`만 execute
- [ ] Golf backfill
- [ ] Hotel backfill
- [ ] Restaurant backfill
- [ ] Attraction EAV backfill
- [ ] includes_excludes backfill
- [ ] content_sections backfill
- [ ] 기존 데이터 count 비교
- [ ] JSON parse validation sampling
- [ ] Security Advisor 확인

---

# 28. 저장 API TODO

- [ ] auth 필수
- [ ] `expectedUpdatedAt` 필수
- [ ] JSON runtime validation
- [ ] entity type whitelist
- [ ] transaction save
- [ ] child row missing fail-loud
- [ ] stale conflict → 409
- [ ] canonical re-read
- [ ] partial response 금지
- [ ] detail + list revalidation
- [ ] safe server error
- [ ] secret 로그 금지

---

# 29. Editor UX TODO

- [ ] 모든 변경은 draft에만 반영
- [ ] input blur 시 API 호출 금지
- [ ] toggle 즉시 DB PUT 금지
- [ ] sort 변경 즉시 API 호출 금지
- [ ] section 추가/삭제 draft only
- [ ] field 추가/삭제 draft only
- [ ] unsaved count
- [ ] dirty indicator
- [ ] 닫기 시 unsaved confirm
- [ ] 저장 button 1개
- [ ] 저장 중 button disable
- [ ] SaveProgress 표시
- [ ] 실패 시 draft 유지
- [ ] 성공 후 canonical state 교체
- [ ] `router.refresh()`
- [ ] 완료 toast

---

# 30. Public Renderer TODO

- [ ] visible=false section 숨김
- [ ] visible=false field 숨김
- [ ] sort 순서 적용
- [ ] text
- [ ] textarea
- [ ] boolean
- [ ] number
- [ ] url
- [ ] list
- [ ] empty value 숨김
- [ ] raw HTML 미지원
- [ ] include/exclude 한 번만 표시
- [ ] `예약 전 확인` 없음
- [ ] JSON 없는 legacy row fallback

---

# 31. Production QA — 반드시 실제 브라우저로 검증

## 31.1 Golf

QA 전용 또는 안전한 기존 row에서 원본값 기록 후 진행.

1. Admin에서 Golf edit open
2. section label 변경
3. field label 변경
4. field value 변경
5. 새 field 추가
6. 새 section 추가
7. visible toggle
8. sort 변경
9. **아직 DB 값이 바뀌지 않았는지 확인**
10. `변경사항 저장` 한 번 클릭
11. Progress UI 확인
12. API 200
13. DB `details_json` 확인
14. Admin modal 닫고 다시 열기
15. 값 유지
16. logout
17. public detail 일반 navigation
18. 새 label/value/section 실제 DOM 확인
19. hard refresh 없이 reload 확인
20. 원복 또는 QA entity cleanup

## 31.2 Hotel

위와 동일.

## 31.3 Restaurant

위와 동일 + `restaurant_locations` relation 유지 확인.

## 31.4 Attraction

위와 동일 + legacy EAV fallback / migrated JSON 확인.

---

# 32. 단일 저장 QA

저장 버튼 누르기 전:

- DB row unchanged

저장 후:

- core + details 모두 변경
- 중간 partial state 없어야 함

강제 error 테스트:

- stale `updated_at`
- invalid JSON
- child missing test는 production에서 임의 삭제하지 말고 local/test DB에서 수행

기대:

- 409 conflict 또는 안전한 4xx/5xx
- draft 유지
- modal 유지
- 성공 toast 금지

---

# 33. Performance / Query 원칙

- entity detail 1건 조회 시 `details_json` 1개 추가 fetch는 허용.
- JSON 내부 검색이 필요하지 않은 상태에서 GIN index 추가 금지.
- list page에서 full details_json이 필요 없으면 select하지 않는다.
- detail page에서만 details_json select.
- N+1 생성 금지.
- revalidate 시 전체 entity type 모든 row 순회하지 말고 변경된 entity path만 갱신.

---

# 34. 안전 / 롤백

- 기존 columns 즉시 DROP 금지.
- `field_definitions`, `section_definitions` 즉시 DROP 금지.
- `entity_field_values` 즉시 DROP 금지.
- `includes_excludes`, `content_sections` 즉시 DROP 금지.
- migration 전에 production row count 기록.
- backfill 후 sample + count 비교.
- JSON renderer 문제가 생기면 legacy fallback으로 롤백 가능해야 함.

---

# 35. Static Verification

각 phase 완료 시:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:cms-schema
git diff --check
```

기존 lint debt와 신규 error 분리.

신규 lint error = 0.

---

# 36. Git 작업 규칙

작업 시작:

```bash
git fetch origin
git status
git rev-parse HEAD
git rev-parse origin/main
```

force push 금지.

대규모 작업을 한 commit에 몰지 않는다.

권장 commit:

1. `fix: remove booking summary and stabilize label editing`
2. `feat: add per-entity details json foundation`
3. `feat: add draft-based entity detail editor`
4. `feat: render golf details from entity json`
5. `feat: migrate hotel details to entity json`
6. `feat: migrate restaurant details to entity json`
7. `feat: migrate attraction details to entity json`
8. `docs: record CMS V2 production verification`

---

# 37. Agent 진행 방식

**이 문서를 받고 바로 전체 코드를 한 번에 수정하지 말 것.**

먼저 아래 형식으로 CURRENT STATE AUDIT을 보고하고 멈춘다.

```text
CURRENT_MAIN_SHA:
WORKTREE_STATUS:

BOOKING_SUMMARY_USAGE:
FIELD_DEFINITION_FILTER_BUG:
LABEL_MANAGER_IMMEDIATE_WRITE_PATHS:
LABEL_MANAGER_UPDATED_AT_BUG:
RESTAURANT_LOCATION_ERROR_HANDLING_STATUS: expected COMPLETE at baseline b468b1d; regression-check only

ENTITIES_DETAILS_JSON_EXISTS:
CURRENT_GOLF_DETAIL_SOURCE:
CURRENT_HOTEL_DETAIL_SOURCE:
CURRENT_RESTAURANT_DETAIL_SOURCE:
CURRENT_ATTRACTION_DETAIL_SOURCE:

INCLUDES_TABLE_USAGE:
CONTENT_SECTIONS_TABLE_USAGE:
FIELD_DEFINITIONS_USAGE:
SECTION_DEFINITIONS_USAGE:

MIGRATION_PLAN_DIFF_FROM_THIS_SPEC:
FILES_TO_CHANGE_PHASE_0:
FILES_TO_CHANGE_PHASE_1:
RISKS:
```

사용자가 승인한 뒤 Phase 0부터 진행한다.

단, baseline `b468b1d`에서 이미 완료된 P1 항목을 "미완료"로 되돌리거나 같은 수정을 중복 commit하지 않는다.

---

# 37.1 CMS V2 시작 전 baseline 체크

Agent는 실제 코딩 전에 아래를 먼저 확인하고 보고한다.

- [ ] `HEAD == origin/main == b468b1d238ec0bb3c4254dc53b51ab381ee3e612` 또는, 더 최신이면 diff 설명 완료
- [ ] Vercel current deployment 상태 확인
- [ ] `restaurant_locations` public/admin error handling 존재 확인
- [ ] `예약 전 확인` 사용처 3개 확인
- [ ] `LabelManager` 즉시 PUT/onBlur 구조 확인
- [ ] `scope_entity_type` GET filter 누락 여부 재확인
- [ ] public Golf section heading이 section label/field label 중 무엇을 쓰는지 inventory 작성
- [ ] `entities.details_json` 아직 없는지 DB 확인
- [ ] 기존 `includes_excludes`, `content_sections`, `entity_field_values` row count와 FK 관계 확인
- [ ] 기존 Production row를 destructive하게 바꾸지 않는 rollback 계획 작성

이 baseline 보고가 끝나기 전에 JSON migration을 Production에 적용하지 않는다.

---

# 38. 최종 완료 조건

아래가 전부 실제로 검증되어야 CMS V2 COMPLETE라고 할 수 있다.

- [ ] 예약 전 확인 완전 제거
- [ ] 포함/불포함 중복 없음
- [ ] 개별 entity label 수정 가능
- [ ] 개별 entity custom field 추가 가능
- [ ] 개별 entity custom section 추가 가능
- [ ] 다른 entity에 영향 없음
- [ ] edit 중 DB write 없음
- [ ] Save 한 번으로 transaction 저장
- [ ] 저장 progress UI
- [ ] 실패 시 draft 유지
- [ ] optimistic concurrency
- [ ] canonical response
- [ ] public revalidation
- [ ] logout 후 일반 navigation에서 변경 반영
- [ ] Golf JSON renderer
- [ ] Hotel JSON renderer
- [ ] Restaurant JSON renderer
- [ ] Attraction JSON renderer
- [ ] legacy row fallback
- [ ] Production data backfill 완료
- [ ] QA entity cleanup
- [ ] 기존 production data 손실 0
- [ ] typecheck pass
- [ ] build pass
- [ ] verify:cms-schema pass
- [ ] git diff --check pass
- [ ] 신규 lint error 0
- [ ] Vercel SUCCESS

---

# 39. 최종 보고 형식

```text
STARTING_SHA:
FINAL_SHA:
P1_BASELINE_SHA:
P1_BASELINE_STATUS:
RESTAURANT_LOCATION_FAIL_LOUD_REGRESSION:

BOOKING_SUMMARY_REMOVED:
INCLUDE_EXCLUDE_DUPLICATION:

DETAILS_JSON_MIGRATION:
DETAILS_JSON_BACKFILL:

GOLF_JSON_EDITOR:
HOTEL_JSON_EDITOR:
RESTAURANT_JSON_EDITOR:
ATTRACTION_JSON_EDITOR:

GOLF_JSON_RENDERER:
HOTEL_JSON_RENDERER:
RESTAURANT_JSON_RENDERER:
ATTRACTION_JSON_RENDERER:

DRAFT_ONLY_BEFORE_SAVE_QA:
SINGLE_SAVE_QA:
SAVE_PROGRESS_QA:
SAVE_FAILURE_DRAFT_PRESERVATION_QA:
CONFLICT_QA:
CANONICAL_RESPONSE_QA:
LOGOUT_PUBLIC_SYNC_QA:

GLOBAL_LABEL_MANAGER_STATUS:
LEGACY_FIELD_DEFINITIONS_STATUS:
LEGACY_SECTION_DEFINITIONS_STATUS:
LEGACY_EAV_STATUS:
LEGACY_INCLUDES_STATUS:
LEGACY_CONTENT_SECTIONS_STATUS:

TYPECHECK:
LINT:
LINT_NEW_ERRORS:
BUILD:
VERIFY_CMS_SCHEMA:
DIFF_CHECK:

QA_DATA_CLEANUP:
PUSH_RESULT:
VERCEL_STATUS:

CMS_V2_RESULT:
COMPLETE / NOT_COMPLETE
```

---

## 문서 Revision — 2026-09-22

이 버전은 기존 CMS V2 명세를 `b468b1d238ec0bb3c4254dc53b51ab381ee3e612` 기준으로 갱신했다.

변경점:

- P1 `restaurant_locations` read failure handling을 "확인 필요"에서 **완료 baseline**으로 변경.
- Vercel `SUCCESS` 상태 반영.
- CMS V2 Agent가 이미 끝난 P1 수정/QA를 중복 수행하지 않도록 phase scope 정리.
- Phase 0을 사용자 제보 중심의 CMS 문제(`예약 전 확인`, label persistence, LabelManager immediate write)로 재정의.
- CMS V2 시작 전 baseline checklist 추가.

---

## 결론

이 프로젝트의 상세 CMS는 앞으로 다음 모델을 따른다.

```text
Core relational data
+ per-entity details_json
+ draft editor
+ one save
+ transaction
+ canonical response
+ targeted revalidation
+ generic public renderer
```

골프장 A의 라벨/항목은 골프장 A에만 적용한다.

골프장 B가 전혀 다른 section/field 구조를 가져도 된다.

호텔/식당/볼거리도 같은 editor/renderer 기반으로 확장한다.

그리고 공개 상세에는 더 이상 예약 사이트처럼 보이는 `예약 전 확인`을 표시하지 않는다.

---

# 23. Phase 2.5 구현 상태 (공통 CMS V2 Foundation + Golf Refactor)

## 구현된 공통 모듈

| 모듈 | 경로 | 역할 |
|------|------|------|
| types.ts | `src/lib/entity-details/types.ts` | EntityDetailsDocumentV1, section/item 타입 계약 |
| constants.ts | `src/lib/entity-details/constants.ts` | MAX_SECTIONS, ALLOWED_ITEM_TYPES, ENTITY_TYPE_WHITELIST 등 |
| validate.ts | `src/lib/entity-details/validate.ts` | API boundary 런타임 JSON 검증 (유효하지 않으면 DB write 전 reject) |
| normalize.ts | `src/lib/entity-details/normalize.ts` | 기존 Golf JSON item에 누락된 key/label_ko/sort/is_visible을 메모리에서 보강 |
| diff.ts | `src/lib/entity-details/diff.ts` | 필드 단위 dirty diff 카운팅 (false vs null, 0 vs empty 구분) |
| is-empty-value.ts | `src/lib/entity-details/is-empty-value.ts` | 타입별 빈 값 판정 (false/0은 비어있지 않음, null/""/[]는 비어있음) |
| revalidate-entity.ts | `src/lib/revalidate-entity.ts` | 변경된 entity 1개의 detail + list path만 revalidate |

## 구현된 공통 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| EntityDetailsRenderer | `src/components/entity-details/` | 공개 렌더러 — JSON section/item 라벨 직접 사용, 글로벌 override 없음 |
| EntityDetailsEditor | `src/components/entity-details/` | 공유 에디터 — draft-only, section/item CRUD, label 편집, sort reorder |
| EntityDetailsEditorModal | `src/components/entity-details/` | 모달 래퍼 — dirty guard, 저장 잠금 |
| EntityDetailsSectionEditor | `src/components/entity-details/` | 섹션 에디터 — emoji, title_ko/jp, visibility, sort |
| EntityDetailsItemEditor | `src/components/entity-details/` | 항목 에디터 — label_ko/jp, type select, typed value editors |
| EntitySaveProgress | `src/components/entity-details/` | 저장 파이프라인 UI — 실제 이벤트 기반 단계 진행 |

## Core vs Details 소유권

| 구분 | 저장 위치 | 편집 UI |
|------|----------|---------|
| Core relational (display_name, address, phone, google_maps_url) | `entities` + `golf_courses` 테이블 | GolfEditModal (기본정보 수정) |
| Variable details (course_summary, play_cart, rental, dress_code 등) | `entities.details_json` (JSONB) | EntityDetailsEditor (세부사항 수정) |

- Core 저장은 details_json을 변경하지 않음
- Details 저장은 core 필드를 변경하지 않음
- 동일 논리 필드가 두 곳에서 편집 불가

## 글로벌 정의 역할

- `section_definitions`, `field_definitions` 테이블은 Phase 2.5에서 삭제하지 않음
- 역할: 새 entity 생성 시 템플릿/기본값 제공, 레거시 fallback
- migrated JSON entity에서는 per-entity JSON 라벨이 canonical
- 글로벌 라벨이 JSON section/item 라벨을 override하지 않음

## Per-entity 라벨 우선순위

```
1. entities.details_json.sections[].title_ko  ← canonical (migrated entity)
2. section_definitions fallback               ← 레거시 entity만
```

```
1. entities.details_json.sections[].items[].label_ko  ← canonical
2. field_definitions fallback                          ← 레거시 entity만
```

## 저장 파이프라인

7단계 실제 이벤트 기반 (fake timer 없음):

1. **validate** — 런타임 JSON 검증
2. **prepare** — 변경사항 정규화
3. **save** — RPC `admin_save_entity_editor_v1` 호출
4. **conflict** — 충돌 확인 (optimistic concurrency)
5. **canonical** — DB에서 canonical 재-read
6. **revalidate** — 변경된 entity만 targeted revalidation
7. **done** — 완료

## Golf JSON Enrichment

- `scripts/enrich-golf-details-json.mjs` — 누락 메타데이터 보강 스크립트
- Production에서 이미 실행 완료 (9/9 Golf entity)
- Idempotent — 두 번 실행해도 변경 없음
- Optimistic concurrency 사용 — 동시성 충돌 시 blind overwrite 없음

## 런타임 검증

- API boundary에서 `validateEntityDetailsDocument()` 실행
- 검증 항목: version, sections array, unique IDs/keys, label 길이, type whitelist, URL protocol, list members, payload size, NaN/Infinity 금지
- 검증 실패 시 DB write 전 safe 4xx 반환

## 롤백

- Golf enrichment는 additive metadata만 추가 (값/ID 변경 없음)
- 롤백 시: enrichment 전 JSON snapshot으로 복원 가능
- 코드 롤백: `git revert` 커밋 단위로 가능

## 남은 작업

- Phase 3: Hotel/Restaurant/Attraction에 동일 editor/renderer 적용
- Phase 6: 레거시 admin 컴포넌트 정리 (ContentSectionsEditor, IncludesExcludesEditor 등)
