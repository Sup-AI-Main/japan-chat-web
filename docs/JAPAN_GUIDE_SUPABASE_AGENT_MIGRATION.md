# Japan Guide CMS — Google Sheets → Supabase DB 전환 Agent 명령서

기준: 2026-09-09  
대상 프로젝트: 일본 골프 여행 가이드 웹앱  
목표: **Google Sheets를 Runtime DB로 완전히 제거하고 Supabase PostgreSQL을 Single Source of Truth로 전환**

---

# 0. 최종 목표

현재 앱의 데이터 접근 구조:

```text
UI
→ API / Server Action
→ google-sheets.ts
→ Google Sheets API
→ Spreadsheet
```

를 아래 구조로 변경하세요.

```text
UI
→ API / Server Action
→ supabase-cms.ts
→ Supabase PostgreSQL
```

최종 원칙:

```text
Supabase = Single Source of Truth
```

Google Sheets는 더 이상 Runtime 읽기/쓰기 대상으로 사용하지 않습니다.

---

# 1. 절대 변경하지 말아야 할 것

이번 작업은 **Persistence Layer 전환**입니다.

다음 기능/화면은 불필요하게 재설계하지 마세요.

- 사용자 화면 디자인
- 관리자 로그인 UI
- 관리자 메뉴 위치
- 기존 URL 구조
- 카드 디자인
- 모바일 레이아웃
- 기존 라우팅 구조
- 카테고리 표시 방식의 UX
- 기존 데이터 문구
- 기존 이미지/배경
- 기존 CRUD 버튼 위치

가능하면 기존 TypeScript 모델/API response shape를 유지하고,
데이터 저장소만 Google Sheets → Supabase로 교체하세요.

---

# 2. 기존 Google Sheets 의존성 제거 대상

프로젝트 전체 검색 후 다음 의존성을 제거하거나 Runtime에서 사용하지 않도록 변경하세요.

검색 키워드:

```text
google-sheets
googleapis
spreadsheets.values
values.get
values.update
values.append
values.batchUpdate
GOOGLE_SHEET
GOOGLE_SPREADSHEET
GOOGLE_SERVICE_ACCOUNT
GOOGLE_PRIVATE_KEY
spreadsheetId
sheetName
updateRowById
appendRow
getRows
sheet cache
row index
header reverse map
```

특히 다음 파일/패턴을 추적하세요.

```text
src/lib/google-sheets.ts
src/app/api/**
src/lib/**
src/app/admin/**
src/components/**
```

기존 `google-sheets.ts`의 public 함수가 여러 곳에서 호출된다면
호출부를 대규모로 바꾸기보다:

```text
google-sheets.ts API surface
→ supabase-cms.ts repository
```

형태로 점진적으로 교체해도 됩니다.

최종적으로 Runtime 코드에서 Google Sheets API를 호출하면 안 됩니다.

---

# 3. Supabase 환경변수

Production / Preview / Local 환경에 다음 값이 필요합니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

원칙:

- Public read:
  - anon key 사용 가능
- 관리자 INSERT / UPDATE / DELETE:
  - 반드시 server-side에서만 `SUPABASE_SERVICE_ROLE_KEY`
- service role key:
  - Client Component
  - browser bundle
  - NEXT_PUBLIC_*
  에 절대 노출 금지

---

# 4. Supabase Client 분리

권장 구조:

```text
src/lib/supabase/
├─ client.ts
├─ server.ts
└─ admin.ts
```

## client.ts

브라우저에서 필요한 public client만 생성.

```ts
createBrowserClient(...)
```

또는 현재 프로젝트의 Supabase 패턴에 맞게 사용.

---

## server.ts

Server Component / Route Handler에서
사용자 세션 기반 Supabase client가 필요한 경우 사용.

---

## admin.ts

관리자 CMS write용.

```ts
createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)
```

이 client는 server-only로 제한하세요.

가능하면:

```ts
import 'server-only'
```

를 사용하세요.

---

# 5. 최종 DB 테이블 구조

Runtime DB는 아래 테이블을 사용합니다.

```text
areas
categories
entities

golf_courses
hotels
restaurants

restaurant_locations
travel_times

faq
content_sections
includes_excludes
```

다음 V1 테이블은 사용하지 않습니다.

```text
admin_options
cms_schema
cms_admin_notes
legacy_google_sheet_rows
```

---

# 6. areas

실제 지역만 저장합니다.

## Schema

```text
id                uuid PK
code              text UNIQUE NOT NULL
name_kr           text NOT NULL
name_jp           text NULL
icon              text NULL
description       text NULL
active            boolean NOT NULL DEFAULT true
sort              integer NOT NULL DEFAULT 0
created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

현재 운영 지역:

```text
DOS
BEPPU
```

공통 콘텐츠를 위해 `ALL` row를 만들지 않습니다.

FAQ 등의 공통 데이터는:

```text
area_id = NULL
```

을 사용합니다.

---

# 7. categories

기존 `admin_options`의 CATEGORY 역할을 대체합니다.

## Schema

```text
id                      uuid PK
code                    text UNIQUE NOT NULL
label                   text NOT NULL
icon                    text NULL
group_type              text NOT NULL
description             text NULL
allows_specific_target  boolean NOT NULL DEFAULT false
allowed_entity_types    text[] NOT NULL DEFAULT '{}'
navigation_visible      boolean NOT NULL DEFAULT true
active                  boolean NOT NULL DEFAULT true
sort                    integer NOT NULL DEFAULT 0
created_at              timestamptz NOT NULL DEFAULT now()
updated_at              timestamptz NOT NULL DEFAULT now()
```

## group_type

```text
AREA
COMMON
SYSTEM
```

## 운영 카테고리

```text
GOLF
HOTEL
RESTAURANT
ONSEN
DRIVER
GENERAL
REFUND
MONEY
EXTRA_PAYMENT
```

## 시스템 카테고리

```text
TRAVEL_TIME
TEST
```

SYSTEM 카테고리는 일반 사용자 navigation에 노출하지 않습니다.

---

# 8. entities

가장 중요한 중심 테이블입니다.

골프장 / 호텔 / 음식점 / 기타 장소의 공통 identity를 저장합니다.

## Schema

```text
id            uuid PK
slug          text UNIQUE NOT NULL
entity_type   text NOT NULL
area_id       uuid FK → areas.id
display_name  text NOT NULL
active        boolean NOT NULL DEFAULT true
sort          integer NOT NULL DEFAULT 0
created_at    timestamptz NOT NULL DEFAULT now()
updated_at    timestamptz NOT NULL DEFAULT now()
```

## entity_type

```text
GOLF
HOTEL
RESTAURANT
PLACE
```

## 기존 URL 호환

기존 문자열 ID:

```text
dos_golf_kaho
dos_hotel_holiday
beppu_hotel_grandmercure
```

는 삭제하지 말고:

```text
entities.slug
```

에 저장합니다.

따라서 기존 URL:

```text
/dos/golf/dos_golf_kaho
```

등은 가능한 한 유지하세요.

---

# 9. golf_courses

골프장 고유 상세정보만 저장합니다.

공통:

```text
slug
area
display_name
active
sort
```

는 `entities`에 있습니다.

## Schema

```text
entity_id                    uuid PK/FK → entities.id
official_name                text
address                      text
phone                        text
course_summary               text
play_cart                    text
clubhouse_dining             text
bath_shower                  text
rental                       text
dress_code                   text
product_reference_minutes    integer
travel_time_note             text
google_maps_url              text
source_url                   text
status                       text
last_verified                date
updated_at                   timestamptz
```

## 조회

골프장 상세 조회 시:

```sql
entities
JOIN golf_courses
ON entities.id = golf_courses.entity_id
```

---

# 10. hotels

호텔 고유 상세정보입니다.

## Schema

```text
entity_id               uuid PK/FK

official_name           text
address                 text
phone                   text

checkin_time            text
checkout_time           text

breakfast_summary       text
breakfast_place         text
breakfast_time          text
breakfast_last_entry    text

dinner_summary          text
dinner_place            text
dinner_time             text
dinner_last_entry       text

bath_spa_summary        text
has_public_bath         boolean
has_outdoor_onsen       boolean
has_sauna               boolean
bath_spa_hours          text
tattoo_policy           text

atm_payment             text
transport_note          text
other_info              text

google_maps_url         text
source_url              text
status                  text
last_verified           date
updated_at              timestamptz
```

## 중요

기존 구형 필드:

```text
checkin
checkout
breakfast
bath_spa
hotel_dining
```

와 신형 상세 필드를 중복 유지하지 마세요.

새 DB 기준 canonical field는 위 Schema를 사용하세요.

---

# 11. restaurants

음식점 고유 상세정보입니다.

## Schema

```text
entity_id         uuid PK/FK

category          text
address           text
hours             text
price_range       text
phone             text

menu_kr           text
menu_jp           text
menu_price        text
closed_days       text
description       text
recommended       boolean

google_maps_url   text
source_url        text
status            text
last_verified     date
updated_at        timestamptz
```

공통 이름/지역/노출/정렬은 `entities`.

---

# 12. restaurant_locations

음식점과 호텔/골프장/장소의 거리 관계입니다.

기존:

```text
near_type
near_id
distance
```

를 restaurants에 직접 저장하지 않습니다.

## Schema

```text
id                     uuid PK
restaurant_entity_id   uuid FK → entities.id
near_entity_id         uuid FK → entities.id

distance_text          text
distance_km            numeric(8,2)
drive_minutes          integer
walk_minutes           integer
sort                   integer

created_at             timestamptz
updated_at             timestamptz
```

Unique:

```text
restaurant_entity_id + near_entity_id
```

한 식당이 여러 호텔/골프장에 연결될 수 있습니다.

---

# 13. travel_times

Entity 간 이동시간을 저장합니다.

주로:

```text
HOTEL → GOLF
```

## Schema

```text
id                           uuid PK
legacy_id                    text UNIQUE

from_entity_id               uuid FK → entities.id
to_entity_id                 uuid FK → entities.id

product_reference_minutes    integer

display_time                 text
min_minutes                  integer
max_minutes                  integer

note                         text
source                       text
status                       text
directions_url               text
time_basis                   text

active                       boolean
sort                         integer
last_verified                date
created_at                   timestamptz
updated_at                   timestamptz
```

## 예

```text
display_time = "약 50~60분"
min_minutes = 50
max_minutes = 60
```

화면에서는 기존 문자열 표현을 유지할 수 있습니다.

---

# 14. faq

질문/답변 테이블입니다.

기존:

```text
area
category
related_type
related_id
related_name
```

문자열 관계를 제거하고 FK를 사용합니다.

## Schema

```text
id                  uuid PK
legacy_id           text UNIQUE

area_id             uuid FK → areas.id NULL 가능
category_id         uuid FK → categories.id
related_entity_id   uuid FK → entities.id NULL 가능

scope               text NOT NULL
question            text NOT NULL
answer              text NOT NULL
source_url          text
status              text

active              boolean
sort                integer

created_at          timestamptz
updated_at          timestamptz
```

## scope

```text
AREA
SPECIFIC
```

## 공통 FAQ

기존:

```text
area = ALL
```

새 DB:

```text
area_id = NULL
```

## 특정 호텔 FAQ

```text
category_id = ONSEN
related_entity_id = 그랜드 머큐어 entity UUID
scope = SPECIFIC
```

`related_name`은 저장하지 않습니다.

화면에는:

```text
entities.display_name
```

을 JOIN해서 표시하세요.

---

# 15. content_sections

상세페이지 반복형 콘텐츠.

예:

```text
코스 안내
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
추가 안내
```

## Schema

```text
id                 uuid PK
legacy_id          text
parent_entity_id   uuid FK → entities.id

title              text NOT NULL
content            text NOT NULL
emoji              text
sort               integer
is_visible         boolean

created_at         timestamptz
updated_at         timestamptz
```

기존:

```text
parent_type
parent_id
```

사용 금지.

이제:

```text
parent_entity_id
```

하나만 사용합니다.

---

# 16. includes_excludes

포함사항 / 불포함사항.

## Schema

```text
id                 uuid PK
legacy_id          text
parent_entity_id   uuid FK → entities.id

type               text NOT NULL
text_kr            text NOT NULL
text_jp            text

sort               integer
is_visible         boolean

created_at         timestamptz
updated_at         timestamptz
```

## type

```text
INCLUDED
EXCLUDED
```

---

# 17. 관계도

```text
areas
  │
  └── entities
        ├── golf_courses
        ├── hotels
        ├── restaurants
        │      └── restaurant_locations ──> entities
        │
        ├── content_sections
        └── includes_excludes


categories
  │
  └── faq
        └── related_entity_id ──> entities


entities
  │
  └── travel_times
        ├── from_entity_id
        └── to_entity_id
```

---

# 18. Repository Layer 생성

새 파일 생성 권장:

```text
src/lib/supabase-cms.ts
```

여기에 DB 접근을 집중하세요.

UI Component가 직접 Supabase query를 난립시키지 않도록 하세요.

---

# 19. 기존 함수 대응표

현재 프로젝트에 존재하는 함수명을 먼저 검색해서
가능한 한 동일 함수명/API를 유지하세요.

예:

```text
기존                          신규
----------------------------------------------------
getGolfCourses()             → Supabase
getGolfCourseById()          → Supabase
getHotels()                  → Supabase
getHotelById()               → Supabase
getRestaurants()             → Supabase
getRestaurantById()          → Supabase
getTravelTimes()             → Supabase
getFaqByCategory()           → Supabase
getIncludesExcludes()        → Supabase
getContentSections()         → Supabase
getAreaCategories()          → categories + areas
getCommonCategories()        → categories
```

---

# 20. getGolfCourses()

기존 return shape를 확인해서 최대한 유지하세요.

DB query 개념:

```text
entities
filter entity_type = GOLF
filter area
filter active
order sort

JOIN golf_courses
```

Supabase 예:

```ts
.from('entities')
.select(`
  id,
  slug,
  display_name,
  active,
  sort,
  area:areas(code, name_kr, name_jp),
  golf:golf_courses(*)
`)
.eq('entity_type', 'GOLF')
.eq('active', true)
.order('sort')
```

실제 API 문법은 현재 설치된 Supabase JS 버전에 맞춰 작성하세요.

---

# 21. getGolfCourseById()

기존 `id` 파라미터는 UUID가 아니라 기존 slug일 가능성이 높습니다.

따라서:

```text
entities.slug = id
```

로 찾으세요.

```text
slug = dos_golf_kaho
```

찾은 entity UUID로 golf_courses JOIN.

---

# 22. getHotels()

```text
entities.entity_type = HOTEL
```

기준.

area와 active/sort는 entities에서 필터링하세요.

---

# 23. getRestaurants()

```text
entities.entity_type = RESTAURANT
```

음식점 주변 장소가 필요한 경우:

```text
restaurant_locations
JOIN entities
```

를 사용하세요.

---

# 24. getTravelTimes()

기존:

```text
hotel_id
golf_id
```

검색을 새 구조로 변환.

1. slug로 hotel entity UUID 조회
2. slug로 golf entity UUID 조회
3. travel_times:
   - from_entity_id
   - to_entity_id
   조회

가능하면 join query로 한 번에 처리.

---

# 25. FAQ 조회

기존 URL:

```text
/guide/[category]
```

의 category 문자열은:

```text
categories.code
```

와 매칭.

공통 FAQ:

```text
area_id IS NULL
```

지역 FAQ:

```text
area_id = selected area
```

특정 entity FAQ:

```text
related_entity_id
```

기준으로 처리.

---

# 26. 카테고리 UI

기존 `admin_options`를 읽지 마세요.

## 지역별 카테고리

```text
categories.group_type = AREA
navigation_visible = true
active = true
```

## 공통 카테고리

```text
categories.group_type = COMMON
navigation_visible = true
active = true
```

정렬:

```text
sort ASC
```

---

# 27. 신규 카테고리 생성

새 CATEGORY 추가 시 새 테이블을 만들지 않습니다.

```text
categories INSERT
```

필수 UI:

```text
카테고리 이름
code
emoji/icon
group_type
description
specific target 가능 여부
allowed entity types
active
sort
```

관리자가 일반적으로 입력할 것은 최소화하세요.

예:

```text
이름: 쇼핑 안내
아이콘: 🛍️
그룹: COMMON
```

code는 기존 프로젝트 정책에 맞게 자동 생성 가능.

---

# 28. 이모지 Picker

카테고리 create/edit 시:

```text
categories.icon
```

을 사용.

기존처럼 icon이 무조건 📌로 강제되는 구조 금지.

선택값이 있으면 그대로 저장.

---

# 29. 관리자 CRUD 원칙

모든 관리자 Write:

```text
Admin UI
→ API Route / Server Action
→ server-side auth check
→ service-role Supabase client
→ DB
```

브라우저에서 service role로 직접 DB 수정 금지.

---

# 30. 관리자 권한 검증

기존 관리자 세션 검증 로직을 유지하세요.

중요:

```text
UI에서 버튼이 숨겨졌다고 보안이 되는 것이 아님
```

모든 POST/PATCH/DELETE API는 서버에서 관리자 권한을 다시 검증해야 합니다.

---

# 31. 골프장 CREATE

트랜잭션 개념:

```text
entities INSERT
→ golf_courses INSERT
```

두 번째가 실패하면 첫 entity가 orphan으로 남으면 안 됩니다.

Supabase RPC/Postgres function 또는 보상삭제를 사용하세요.

권장:

```text
DB function / RPC
```

또는 현재 구조상 간단하면:

```text
entity insert
→ detail insert
→ 실패 시 entity delete
```

---

# 32. 호텔 CREATE

```text
entities
→ hotels
```

동일 원칙.

---

# 33. 음식점 CREATE

```text
entities
→ restaurants
→ restaurant_locations (선택)
```

---

# 34. UPDATE

예: 골프장 이름 수정

공통 필드:

```text
entities.display_name
```

골프 고유 필드:

```text
golf_courses.course_summary
```

를 각각 수정.

한 Edit Modal에서 두 테이블 값을 수정하는 경우
부분 성공이 발생하지 않도록 처리하세요.

---

# 35. DELETE 정책

가능하면 관리자 UI의 일반 삭제는:

```text
active = false
```

soft delete를 우선 고려.

실제 hard delete가 필요한 경우:

```text
entities DELETE
```

하면 상세 subtype과:

```text
content_sections
includes_excludes
restaurant_locations
travel_times
```

등 cascade 정책을 확인.

FAQ는 `related_entity_id ON DELETE SET NULL`.

---

# 36. content_sections CRUD

CREATE:

```text
parent slug
→ entities.id resolve
→ content_sections INSERT
```

UPDATE:

```text
content_sections.id UUID
```

또는 기존 transition 동안 legacy_id를 쓸 수 있으나
신규 데이터는 UUID `id` 사용 권장.

DELETE:

```text
hard delete
```

또는 `is_visible=false`.

현재 UI 정책과 맞춰 선택.

---

# 37. includes_excludes CRUD

동일하게:

```text
parent_entity_id
```

사용.

기존 `parent_type / parent_id` logic 제거.

---

# 38. updated_at

앱에서 매번:

```ts
updated_at: new Date().toISOString()
```

를 직접 넣을 필요가 없습니다.

DB Trigger:

```text
set_updated_at()
```

가 자동 처리하도록 되어 있습니다.

단 created_at은 INSERT 시 DB default 사용.

---

# 39. 캐시

Google Sheets용 15분 TTL cache 등 기존 캐시는 재검토하세요.

Supabase DB 전환 후 관리자 수정이 즉시 반영되어야 합니다.

다음 캐시를 검색:

```text
unstable_cache
cache()
revalidate
revalidateTag
revalidatePath
Zustand TTL
15 min
900000
```

관리자 write 성공 후:

```text
revalidatePath(...)
```

또는 현재 사용 중인 정확한 cache key/tag만 invalidate.

전체 사이트 force-dynamic 남발 금지.

---

# 40. 성공 Toast 원칙

다음 경우에만:

```text
저장 완료
```

표시.

```text
Supabase UPDATE/INSERT 성공
+
error === null
+
필요한 response validation 성공
```

실패하면:

```text
저장에 실패했습니다
```

화면 local state만 변경하고 성공 표시하는 구조 금지.

---

# 41. Optimistic UI

가능하면 이번 전환에서는:

```text
DB 성공
→ local state update
```

순서를 권장.

Optimistic UI를 사용한다면 실패 rollback 필수.

---

# 42. RLS

Public:

```text
active = true
is_visible = true
```

만 SELECT 가능.

Client-side write policy는 만들지 않습니다.

service role은 RLS를 우회하므로
서버 관리자 인증이 필수입니다.

---

# 43. 기존 `admin_options` 제거 대응

기존 코드에서:

```text
getAdminOptions()
updateAdminOption()
createAdminOption()
deleteAdminOption()
```

등이 있으면 역할별로 재배치.

## AREA

```text
areas
```

## CATEGORY

```text
categories
```

## SCOPE

DB row로 관리하지 않음.

코드 enum:

```ts
type Scope = 'AREA' | 'SPECIFIC'
```

## RELATED_TYPE

`entities.entity_type`

을 사용.

---

# 44. 기존 group 상수

기존:

```text
GROUP_AREA
GROUP_COMMON
```

이 있다면 유지 가능.

단 값은:

```text
categories.group_type
```

과 맞춰야 함.

---

# 45. Types 재정리

`src/lib/types.ts` 확인.

권장 타입:

```ts
type Area = {
  id: string
  code: string
  nameKr: string
  nameJp?: string | null
  icon?: string | null
  active: boolean
  sort: number
}
```

```ts
type Category = {
  id: string
  code: string
  label: string
  icon?: string | null
  groupType: 'AREA' | 'COMMON' | 'SYSTEM'
  allowsSpecificTarget: boolean
  allowedEntityTypes: string[]
  navigationVisible: boolean
  active: boolean
  sort: number
}
```

```ts
type EntityType = 'GOLF' | 'HOTEL' | 'RESTAURANT' | 'PLACE'
```

기존 UI 모델을 유지하기 위해 mapping layer를 두어도 됩니다.

---

# 46. snake_case ↔ camelCase

DB는 snake_case 유지.

UI 코드에서 camelCase를 사용 중이면 repository에서 변환.

예:

```text
display_name
→ displayName
```

이 mapping을 여러 컴포넌트에 복붙하지 말고
repository/helper에서 한 번만 처리.

---

# 47. Error Handling

모든 Supabase query에서:

```ts
const { data, error } = ...
```

반드시 error 확인.

금지:

```ts
const { data } = ...
return data ?? []
```

이렇게 오류를 빈 배열로 숨기는 패턴.

서버 로그:

```text
operation
table
entity slug/id
error code
error message
```

정도만 남기세요.

Service role key나 secret 출력 금지.

---

# 48. N+1 Query 방지

리스트 페이지에서 entity마다 별도 query 반복 금지.

가능하면 Supabase relationship select/JOIN 사용.

예:

```text
entities + golf_courses
```

한 query.

FAQ related name도:

```text
related_entity:entities(display_name, slug, entity_type)
```

한 query.

---

# 49. 상세 페이지 Query 전략

골프 상세:

```text
entities + golf_courses
content_sections
includes_excludes
restaurants 관계
travel_times
FAQ
```

필요 데이터가 많다면
2~4개의 명확한 병렬 query는 허용.

반대로 row마다 10개씩 query하는 구조 금지.

---

# 50. 데이터베이스 FK를 신뢰

기존 Sheet 방식처럼 코드에서:

```text
parent exists?
related exists?
```

를 모두 문자열로 수동 검증하지 말고
FK를 적극 사용.

하지만 사용자 친화적 오류 메시지를 위해
존재 여부를 먼저 확인할 수는 있음.

---

# 51. legacy_id

현재 seed 데이터에는 기존 Sheet ID를 보존한 필드가 있습니다.

```text
travel_times.legacy_id
faq.legacy_id
content_sections.legacy_id
includes_excludes.legacy_id
```

기존 데이터 추적/전환용.

신규 데이터는 UUID `id`를 기본 식별자로 사용하세요.

---

# 52. Existing URL Compatibility

골프장/호텔/음식점 페이지 URL에서
기존 문자열 id를 쓰고 있다면:

```text
entities.slug
```

사용.

UUID를 URL에 강제 노출할 필요 없습니다.

---

# 53. Migration 후 삭제할 환경변수

Supabase 전환과 Production E2E 완료 후
다음 Google Sheets 관련 env는 제거하세요.

예:

```text
GOOGLE_SHEET_ID
GOOGLE_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_PRIVATE_KEY
GOOGLE_CLIENT_EMAIL
```

단 다른 기능에서 Google API를 사용하는 env가 있다면
무조건 삭제하지 말고 실제 참조 여부 확인.

Google Calendar 기능 등 다른 서비스와 혼동하지 마세요.

---

# 54. Dependency 정리

Google Sheets 전용으로만 설치된 package가 있다면
사용처 0 확인 후 제거.

예:

```text
googleapis
```

단 Google Calendar 등 다른 기능이 같은 package를 사용한다면 제거 금지.

반드시 전체 프로젝트 검색 후 판단.

---

# 55. API Route 전수조사

다음 기능의 API/Server Action을 전부 확인하세요.

```text
area
category
golf
hotel
restaurant
faq
travel_times
includes_excludes
content_sections
```

각각:

```text
GET
POST
PATCH/PUT
DELETE
```

가 Google Sheets를 호출하지 않고 Supabase를 사용해야 합니다.

---

# 56. Production CRUD 테스트

## Category

CREATE:

```text
이름: 쇼핑 안내
icon: 🛍️
group: COMMON
```

검증:

```text
categories row 생성
→ UI 즉시 표시
→ F5 유지
```

UPDATE:

```text
쇼핑 안내
→ 쇼핑 정보
```

DELETE/비활성화 확인.

---

# 57. Golf 테스트

기존 골프장 하나 선택.

예:

```text
dos_golf_kaho
```

수정:

```text
course_summary
```

검증:

```text
DB 값 변경
F5 유지
새 탭 유지
```

원래 값으로 복구.

---

# 58. Hotel 테스트

예:

```text
dos_hotel_holiday
```

`other_info` 또는 안전한 테스트 필드 수정.

동일 검증.

---

# 59. Restaurant 테스트

식당명 또는 description 수정 후
DB/F5 검증.

원복.

---

# 60. FAQ 테스트

CREATE:

```text
테스트 질문
테스트 답변
```

DB:

```text
category_id FK
area_id
related_entity_id
```

정확한지 확인.

UPDATE / DELETE도 검증.

---

# 61. Content Section 테스트

기존 골프장에:

```text
emoji: 📌
title: 테스트 안내
content: 테스트 내용
```

CREATE.

F5 후 유지.

수정/삭제.

---

# 62. Includes/Excludes 테스트

현재 seed는 0 rows.

실제 하나 생성:

```text
INCLUDED
그린피 포함
```

DB row 생성/F5 확인 후
테스트 종료 시 제거.

---

# 63. Travel Time 테스트

기존 hotel-golf 관계 하나 수정.

검증:

```text
from_entity_id
to_entity_id
display_time
min_minutes
max_minutes
```

일치.

---

# 64. 모바일 회귀 테스트

최소:

```text
414 × 896
```

확인:

- 관리자 편집 버튼
- 카테고리 생성
- emoji picker
- modal
- 저장
- 삭제
- 페이지 새로고침
- horizontal overflow 없음

---

# 65. 기존 문제 재발 방지

이번 전환 후 다음 문제는 없어야 합니다.

```text
저장 완료 → F5 원복
```

```text
카테고리 이름 생성 → UI blank
```

```text
emoji 선택 → 📌 강제 저장
```

```text
row index off-by-one
```

```text
Google Sheet column mapping mismatch
```

```text
Sheet header 순서 변경으로 update 실패
```

---

# 66. Google Sheet Fallback 금지

Supabase query 실패 시:

```text
Google Sheet에서 다시 읽기
```

같은 fallback을 만들지 마세요.

그렇게 하면 다시 이중 데이터 소스 문제가 생깁니다.

원칙:

```text
Supabase only
```

---

# 67. Dual Write 금지

다음 구조 금지:

```text
Supabase UPDATE
+
Google Sheet UPDATE
```

한쪽만 성공하면 데이터가 갈라집니다.

이번 전환 이후 write는 Supabase만.

---

# 68. Dual Read 금지

다음도 금지:

```text
Supabase 먼저
없으면 Google Sheet
```

마이그레이션 완료 후에는 Supabase만 읽으세요.

---

# 69. 테스트 데이터 처리

기존 Google Sheet에서 테스트성 데이터가 일부 있었습니다.

새 seed에서는 운영에 의미 없는:

```text
CACHE_TEST_*
SHOPPING_TEST_*
PRODUCTION_E2E_TEST
PERSIST_TEST
```

등 admin option 테스트 행은 제외했습니다.

그러나 실제 FAQ 내용이 존재하는 테스트 row는 데이터 보존을 위해 일부 포함되어 있을 수 있습니다.

Agent가 임의로 기존 데이터까지 삭제하지 마세요.

운영자가 삭제 여부를 결정하게 하세요.

---

# 70. RLS와 관리자 화면

관리자 페이지 자체가 authenticated user라 해도
authenticated role 전체에 write policy를 열지 마세요.

현재 관리자 모델이 별도 비밀번호/session 방식이면
DB-level authenticated user와 관리자 권한이 동일하지 않을 수 있습니다.

따라서 write는 server service role + admin authorization 검증.

---

# 71. Server-only API 예시 원칙

```ts
export async function PATCH(req: Request) {
  const admin = await requireAdmin()

  if (!admin) {
    return Response.json({ success: false }, { status: 401 })
  }

  const body = await req.json()

  const result = await update...

  return Response.json({
    success: true,
    data: result
  })
}
```

실제 프로젝트 helper를 재사용하세요.

---

# 72. Input Validation

DB write 전 최소 validation:

## Category

```text
label trim non-empty
code non-empty
group_type valid
icon optional
```

## FAQ

```text
question non-empty
answer non-empty
category exists
SPECIFIC → related_entity_id required
```

## Entity

```text
slug unique
display_name non-empty
entity_type valid
```

---

# 73. Unique Conflict

`entities.slug`, `categories.code` unique conflict는
500으로 숨기지 말고 사용자에게:

```text
이미 존재하는 코드/ID입니다.
```

같은 명확한 409 처리 권장.

---

# 74. Concurrency

Supabase/Postgres 전환 후에는
Google Sheet row position 문제는 사라지지만
동시 수정 conflict는 여전히 고려.

중요 데이터에서 기존 `updated_at`을 사용한 optimistic concurrency가 이미 있다면 유지 가능.

예:

```text
client sends last updated_at
server updates where updated_at = previous
```

0 rows면 409 Conflict.

기존 ConflictError 패턴이 있다면 재사용.

---

# 75. 정렬

`sort` 직접 문자열 계산보다 integer 사용.

추가 시:

```text
max(sort) + 1
```

가능.

동시 추가가 중요한 경우 RPC로 atomic 처리 고려.

현재 규모에서는 server-side transaction/RPC가 가장 안정적.

---

# 76. Area / Category 삭제

사용 중인 area/category hard delete는 FK 에러가 날 수 있습니다.

관리자에서는 기본적으로:

```text
active=false
```

로 숨김 권장.

---

# 77. Entity 삭제

골프장/호텔/식당도 기본적으로:

```text
entities.active=false
```

가 안전.

진짜 삭제가 필요한 경우 관계 영향 확인 후 hard delete.

---

# 78. 관리자 화면 데이터 소스

관리자 dropdown도 Supabase를 사용.

예:

```text
지역 dropdown → areas
카테고리 dropdown → categories
골프장 dropdown → entities WHERE entity_type=GOLF
호텔 dropdown → entities WHERE entity_type=HOTEL
음식점 dropdown → entities WHERE entity_type=RESTAURANT
```

하드코딩 금지.

---

# 79. 사용자 화면 데이터 소스

사용자 화면 역시 Supabase.

예:

```text
도스 화면
→ areas.code = DOS
→ entities by area
→ categories group AREA
```

공통 안내:

```text
categories group COMMON
```

---

# 80. Loading/Error UI

DB 전환 때문에 기존 사용자 화면이 blank 되지 않도록
기존 loading/error handling 유지.

단 DB error를:

```text
[]
```

로 조용히 숨겨서 빈 페이지로 만드는 패턴은 금지.

서버 log + 사용자 safe fallback.

---

# 81. Build Checklist

필수:

```text
type-check PASS
lint PASS 또는 기존 unrelated warning만 명확히 보고
build PASS
```

이번 변경으로 새로운 lint/type/build error를 남기지 마세요.

---

# 82. Runtime Test Checklist

```text
[ ] 메인 페이지
[ ] DOS
[ ] BEPPU
[ ] 골프장 목록
[ ] 골프장 상세
[ ] 호텔 목록
[ ] 호텔 상세
[ ] 음식점 목록
[ ] 음식점 상세
[ ] 공통 안내
[ ] FAQ
[ ] 관리자 로그인
[ ] 관리자 메뉴
[ ] category CRUD
[ ] golf CRUD
[ ] hotel CRUD
[ ] restaurant CRUD
[ ] FAQ CRUD
[ ] content_sections CRUD
[ ] includes_excludes CRUD
[ ] travel_times CRUD
```

---

# 83. Production Test

Local만 검증하고 완료 판정 금지.

Production:

```text
japan-chat-web.vercel.app
```

기준 smoke test 필수.

---

# 84. Production Environment

Vercel에 필요한 env:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Production / Preview 범위를 확인.

env 변경 후 재배포 필요 여부 확인.

---

# 85. Security Test

Production browser DevTools에서:

```text
SUPABASE_SERVICE_ROLE_KEY
```

가 JS bundle/network response에 노출되지 않는지 확인.

또한 anon client로 직접:

```text
INSERT / UPDATE / DELETE
```

가 RLS로 거부되는지 확인.

---

# 86. Data Verification

현재 seed 기준 주요 row count:

```text
areas                  2
categories            11
entities              27
golf_courses           9
hotels                 3
restaurants           12
restaurant_locations  12
travel_times          16
faq                   42
content_sections      54
includes_excludes      0
```

Agent가 DB 연결 후 실제 count를 확인하세요.

---

# 87. Entity Count 설명

entities 27개는:

```text
9 golf
3 hotel
12 restaurant
1 place
2 inactive legacy test placeholders
```

입니다.

inactive placeholder는 사용자 화면에 노출되면 안 됩니다.

---

# 88. 데이터 임의 정리 금지

다음과 같은 데이터가 보여도 이번 전환에서 임의 삭제하지 마세요.

```text
?? 문자열
테스트 질문
중복 legacy_id
```

단 Runtime에 영향을 주는 깨진 데이터가 있다면
문제를 보고하고 운영자 승인 후 정리.

---

# 89. content_sections duplicate legacy_id

기존 데이터에:

```text
cs_1788762313142_33j2wn
```

legacy_id가 2개 존재합니다.

새 DB `content_sections.id`는 UUID PK라 문제 없습니다.

따라서 `legacy_id`에 UNIQUE constraint를 걸지 마세요.

---

# 90. Repository 함수 실패 정책

예:

```ts
async function getGolfCourseBySlug(slug)
```

결과 없음:

```text
null
```

DB error:

```text
throw
```

로 구분.

DB error를 not found처럼 처리하지 마세요.

---

# 91. API Response Shape

기존 frontend가:

```json
{
  "success": true,
  "data": {}
}
```

를 기대한다면 유지.

Persistence 전환 때문에 UI 전체 response shape 변경 금지.

---

# 92. 작업 순서

권장 순서:

## Phase 1 — Read

```text
areas
categories
golf
hotels
restaurants
travel_times
faq
content_sections
includes_excludes
```

GET을 Supabase로 변경.

사용자 페이지 정상 확인.

## Phase 2 — Write

관리자:

```text
CREATE
UPDATE
DELETE
```

Supabase로 변경.

## Phase 3 — Remove Google Sheets

모든 call site 0 확인 후 Runtime 의존 제거.

## Phase 4 — Production E2E

실제 CRUD/F5 테스트.

---

# 93. Google Sheet 코드 제거 기준

다음 조건 전부 충족 후에만
Google Sheet runtime 코드를 삭제하세요.

```text
[ ] 모든 read Supabase
[ ] 모든 write Supabase
[ ] production build PASS
[ ] production read smoke PASS
[ ] production CRUD PASS
[ ] F5 persistence PASS
```

---

# 94. 완료 판정 금지 조건

다음 중 하나라도 남으면:

```text
SUPABASE_MIGRATION_COMPLETE
```

라고 보고하지 마세요.

- Google Sheets Runtime read 존재
- Google Sheets Runtime write 존재
- Dual write
- Dual read fallback
- admin CRUD 하나라도 미검증
- F5 후 원복
- service role client 노출
- build fail
- Production 미검증

---

# 95. 최종 보고 형식

작업 완료 후 아래 형식으로 보고하세요.

## 1. Migration Summary

```text
Google Sheets Runtime Dependency: REMOVED / REMAINING
Supabase Read Migration: COMPLETE / PARTIAL
Supabase Write Migration: COMPLETE / PARTIAL
```

## 2. Modified Files

```text
파일명
변경 이유
```

## 3. Removed Google Sheets Calls

```text
function / route
Before
After
```

## 4. Repository Mapping

| Feature | Old | New |
|---|---|---|
| Golf read | Google Sheet | Supabase |
| Golf write | Google Sheet | Supabase |
| Hotel | | |
| Restaurant | | |
| FAQ | | |
| Category | | |
| Content Section | | |
| Includes/Excludes | | |
| Travel Time | | |

## 5. Production CRUD

| Feature | CREATE | READ | UPDATE | DELETE | F5 |
|---|---|---|---|---|---|
| Category | | | | | |
| Golf | | | | | |
| Hotel | | | | | |
| Restaurant | | | | | |
| FAQ | | | | | |
| Content Section | | | | | |
| Includes/Excludes | | | | | |
| Travel Time | | | | | |

## 6. Security

```text
Service role server-only: PASS/FAIL
Anon write blocked: PASS/FAIL
Admin auth checked server-side: PASS/FAIL
```

## 7. Quality Gates

```text
type-check:
lint:
build:
production smoke:
```

## 8. Final Status

모든 조건 충족 시에만:

```text
SUPABASE_CMS_MIGRATION_COMPLETE
```

---

# 96. 최종 핵심 원칙

이번 작업의 목적은 단순히 DB query를 몇 개 바꾸는 것이 아닙니다.

반드시:

```text
Google Sheets
→ 완전 제거

Supabase PostgreSQL
→ 단일 Runtime DB
```

가 되어야 합니다.

관계는:

```text
문자열 ID 연결
→ UUID Foreign Key
```

로 사용합니다.

기존 사용자 URL은:

```text
entities.slug
```

로 유지합니다.

카테고리는:

```text
categories
```

에서 관리합니다.

지역은:

```text
areas
```

에서 관리합니다.

골프/호텔/음식점 공통 identity는:

```text
entities
```

에서 관리합니다.

상세정보는:

```text
golf_courses
hotels
restaurants
```

에서 관리합니다.

반복 콘텐츠는:

```text
content_sections
includes_excludes
```

에서 관리합니다.

질문은:

```text
faq
```

에서 관리합니다.

이동시간은:

```text
travel_times
```

에서 관리합니다.

음식점과 장소 관계는:

```text
restaurant_locations
```

에서 관리합니다.

다른 기능을 불필요하게 건드리지 말고,
Persistence Layer를 정확하고 완전하게 Supabase로 전환하세요.
