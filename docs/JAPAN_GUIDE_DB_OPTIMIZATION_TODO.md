# Japan Guide CMS — Supabase DB 최적화 + Agent Double-Check TODO

기준: 2026-09-09  
대상: 일본 골프 여행 가이드 웹앱  
목표: Google Sheets 최적화가 아니라 **Supabase/PostgreSQL 기준으로 DB 성능, 무결성, 안정성, 유지보수성을 최적화**

---

# 0. 최종 방향

기존 Google Sheets 방식에서 신경 쓰던:

```text
row index
header mapping
append 위치
sheet cache
column 순서
read-back
```

문제는 더 이상 핵심이 아닙니다.

이제 최적화의 중심은:

```text
Schema
Foreign Key
Index
Query shape
RLS
Transaction
Concurrency
Caching
Observability
Vacuum/Analyze
Data validation
```

입니다.

---

# 1. 현재 권장 Runtime 테이블

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

---

# 2. 최적화 원칙

## 2.1 관계는 정규화

다음 문자열 관계는 사용하지 않음:

```text
parent_type + parent_id
related_type + related_id
near_type + near_id
from_type + from_id
to_type + to_id
```

대신:

```text
entities.id UUID FK
```

사용.

---

## 2.2 화면 상세정보는 과도하게 쪼개지 않음

다음은 subtype 테이블에 유지:

```text
golf_courses
hotels
restaurants
```

이유:

- 상세페이지에서 한 번에 읽음
- JOIN 남발 방지
- 과도한 정규화 방지

---

## 2.3 공통 identity는 entities

다음 공통 필드는:

```text
slug
entity_type
area_id
display_name
active
sort
created_at
updated_at
```

`entities`에서 관리.

---

# 3. Primary Key / UUID 최적화

## 현재 권장

```text
UUID PK
```

사용.

Supabase/Postgres에서는:

```sql
gen_random_uuid()
```

권장.

## Double-check

- [ ] 새 row 생성 시 UUID 자동 생성
- [ ] legacy string id는 `slug` 또는 `legacy_id`로만 보존
- [ ] URL 식별자는 UUID보다 `slug` 사용
- [ ] PK와 사용자 노출 식별자를 혼동하지 않음

---

# 4. UNIQUE 제약조건

반드시 검토할 것.

## areas

```text
code UNIQUE
```

## categories

```text
code UNIQUE
```

## entities

```text
slug UNIQUE
```

## restaurant_locations

```text
restaurant_entity_id + near_entity_id UNIQUE
```

## travel_times

현재 구조에 따라:

```text
legacy_id UNIQUE
```

또는 운영 데이터 기준:

```text
from_entity_id + to_entity_id
```

중복이 허용되지 않는다면 UNIQUE 고려.

## Double-check

- [ ] 중복 카테고리 code 방지
- [ ] 중복 slug 방지
- [ ] 동일 식당-장소 관계 중복 방지
- [ ] 동일 이동관계 중복 필요 여부 결정

---

# 5. Foreign Key 최적화

모든 관계에 FK를 사용.

예:

```sql
entities.area_id
→ areas.id
```

```sql
golf_courses.entity_id
→ entities.id
```

```sql
faq.category_id
→ categories.id
```

```sql
faq.related_entity_id
→ entities.id
```

```sql
content_sections.parent_entity_id
→ entities.id
```

```sql
includes_excludes.parent_entity_id
→ entities.id
```

```sql
travel_times.from_entity_id
→ entities.id
```

```sql
travel_times.to_entity_id
→ entities.id
```

## Double-check

- [ ] orphan row가 존재하지 않음
- [ ] FK 없는 문자열 참조가 남아있지 않음
- [ ] 삭제 정책이 의도대로 설정됨

---

# 6. ON DELETE 정책

## 추천

### subtype

```text
golf_courses.entity_id → ON DELETE CASCADE
hotels.entity_id → ON DELETE CASCADE
restaurants.entity_id → ON DELETE CASCADE
```

### content

```text
content_sections.parent_entity_id → CASCADE
includes_excludes.parent_entity_id → CASCADE
```

### restaurant_locations

```text
restaurant_entity_id → CASCADE
near_entity_id → CASCADE
```

### travel_times

```text
from_entity_id → CASCADE
to_entity_id → CASCADE
```

### faq

```text
related_entity_id → SET NULL
```

이유:
연결 대상이 삭제돼도 질문 자체는 보존할 수 있음.

## Double-check

- [ ] hard delete 시 cascade 범위 확인
- [ ] FAQ는 SET NULL 의도 확인
- [ ] area/category는 RESTRICT 또는 soft delete 우선

---

# 7. Soft Delete 전략

가능하면 운영 삭제는:

```text
active = false
```

또는:

```text
is_visible = false
```

사용.

## 추천

### entities

```text
active
```

### categories

```text
active
navigation_visible
```

### faq

```text
active
```

### content_sections

```text
is_visible
```

### includes_excludes

```text
is_visible
```

## Double-check

- [ ] 관리자 삭제 버튼이 실제 hard delete인지 soft delete인지 명확
- [ ] 사용자 화면은 active/visible false 제외
- [ ] 관리자 화면은 inactive 포함 조회 가능

---

# 8. Index 최적화

DB 성능의 핵심.

아래 인덱스를 반드시 검토.

---

## 8.1 entities

추천:

```sql
create index entities_area_type_active_sort_idx
on entities(area_id, entity_type, active, sort);
```

사용처:

```text
DOS 골프장 목록
BEPPU 호텔 목록
맛집 목록
```

Double-check:

- [ ] 목록 페이지가 위 조건으로 조회됨
- [ ] index column 순서가 실제 WHERE/ORDER BY와 맞음

---

## 8.2 categories

추천:

```sql
create index categories_group_active_nav_sort_idx
on categories(group_type, active, navigation_visible, sort);
```

사용처:

```text
AREA category 목록
COMMON category 목록
```

---

## 8.3 FAQ

추천:

```sql
create index faq_area_category_active_sort_idx
on faq(area_id, category_id, active, sort);
```

추가:

```sql
create index faq_related_entity_idx
on faq(related_entity_id);
```

사용처:

```text
/guide/[category]
특정 호텔 FAQ
특정 골프장 FAQ
```

---

## 8.4 content_sections

추천:

```sql
create index content_sections_parent_visible_sort_idx
on content_sections(parent_entity_id, is_visible, sort);
```

---

## 8.5 includes_excludes

추천:

```sql
create index includes_excludes_parent_visible_sort_idx
on includes_excludes(parent_entity_id, is_visible, sort);
```

---

## 8.6 restaurant_locations

추천:

```sql
create index restaurant_locations_near_idx
on restaurant_locations(near_entity_id, sort);
```

추가 고려:

```sql
create index restaurant_locations_restaurant_idx
on restaurant_locations(restaurant_entity_id, sort);
```

---

## 8.7 travel_times

추천:

```sql
create index travel_times_from_to_idx
on travel_times(from_entity_id, to_entity_id, active, sort);
```

---

# 9. Partial Index 고려

데이터가 커질 경우:

```sql
create index ...
where active = true;
```

예:

```sql
create index entities_active_lookup_idx
on entities(area_id, entity_type, sort)
where active = true;
```

장점:

- 사용자 페이지는 거의 active만 조회
- index 작아짐

현재 데이터가 작다면 필수는 아님.

## TODO

- [ ] 데이터량 10k+로 커질 가능성 평가
- [ ] active partial index 필요 여부 판단

---

# 10. Query 최적화 — N+1 제거

금지:

```text
골프장 목록 10개
→ 각 골프장마다 detail query 10번
→ content 10번
```

권장:

```text
entities + subtype JOIN
```

한 번에.

예:

```text
entities
JOIN golf_courses
```

## Double-check

- [ ] 리스트 페이지에서 row마다 추가 query 없음
- [ ] FAQ related name 때문에 N+1 없음
- [ ] restaurant near relation 때문에 N+1 없음

---

# 11. Supabase select 최적화

`select('*')` 남발 금지.

목록에서는 필요한 컬럼만.

예:

```text
slug
display_name
sort
area
```

상세에서만 전체 detail.

## TODO

- [ ] 목록 query select 최소화
- [ ] 상세 query만 큰 text field 조회
- [ ] source_url 등 목록에 필요 없는 컬럼 제외

---

# 12. JOIN Shape 최적화

예:

```text
entities
+ golf_courses
+ areas
```

한 번에.

FAQ:

```text
faq
+ categories
+ related_entity
```

한 번에.

## Double-check

- [ ] client에서 추가 lookup을 반복하지 않음
- [ ] 관계 이름이 DB JOIN으로 해결됨

---

# 13. Pagination

현재 데이터 적어도 구조는 준비.

맛집/FAQ/콘텐츠가 늘어날 가능성 있음.

권장:

```text
range()
limit()
order()
```

FAQ 1000개 이상이면 pagination 필수.

## TODO

- [ ] 관리자 리스트 pagination 또는 cursor 고려
- [ ] 사용자 FAQ는 category 단위라 현재 limit 충분한지 확인

---

# 14. Sorting

`sort integer` 사용.

금지:

```text
"1"
"2"
"10"
```

문자열 sort.

## Double-check

- [ ] 모든 sort 컬럼 int
- [ ] order('sort')
- [ ] null sort 처리 정책 명확

---

# 15. Sort 재정렬 최적화

드래그 정렬 시 row 하나씩 UPDATE 반복 금지.

예:

```text
10개 item
→ UPDATE 10번
```

보다:

```text
RPC / transaction batch
```

권장.

## 추천 RPC

```text
reorder_entities(...)
reorder_categories(...)
reorder_content_sections(...)
```

## TODO

- [ ] 현재 sort UI가 다중 update인지 확인
- [ ] 필요 시 RPC batch update로 변경

---

# 16. Transaction 최적화

다음 작업은 atomic해야 함.

## Golf CREATE

```text
entities INSERT
+
golf_courses INSERT
```

## Hotel CREATE

```text
entities
+
hotels
```

## Restaurant CREATE

```text
entities
+
restaurants
+
restaurant_locations
```

## Double-check

- [ ] 부분 성공 가능성 없음
- [ ] 실패 시 orphan entity 없음

---

# 17. RPC 사용 기준

Supabase RPC 권장 상황:

```text
멀티테이블 create
reorder
bulk update
atomic validation
```

단순 SELECT/UPDATE는 repository에서 직접.

## TODO

- [ ] 너무 많은 RPC 남발하지 않음
- [ ] transaction 필요 작업만 RPC

---

# 18. Concurrency / Lost Update 방지

관리자 2명이 같은 row 수정 가능.

현재 `updated_at` 이용 가능.

권장:

```text
UPDATE
WHERE id = ?
AND updated_at = previous_updated_at
```

0 rows이면:

```text
409 Conflict
```

## Double-check

- [ ] 기존 ConflictError 있다면 재사용
- [ ] stale edit 덮어쓰기 방지

---

# 19. updated_at 자동화

앱에서 직접:

```ts
updated_at: new Date().toISOString()
```

하지 않음.

DB trigger:

```text
set_updated_at()
```

사용.

## Double-check

- [ ] 모든 주요 table trigger 존재
- [ ] app-level updated_at overwrite 제거

---

# 20. CHECK Constraint

문자열 enum은 DB에서 최소 검증.

예:

```text
entity_type
GOLF/HOTEL/RESTAURANT/PLACE
```

```text
scope
AREA/SPECIFIC
```

```text
includes_excludes.type
INCLUDED/EXCLUDED
```

```text
categories.group_type
AREA/COMMON/SYSTEM
```

## TODO

- [ ] 잘못된 문자열 값 DB insert 차단
- [ ] 코드 enum과 DB check sync

---

# 21. NOT NULL 최적화

필수 값에 Nullable 남발 금지.

검토 대상:

```text
areas.code
areas.name_kr

categories.code
categories.label
categories.group_type

entities.slug
entities.entity_type
entities.display_name

faq.category_id
faq.question
faq.answer
faq.scope

content_sections.parent_entity_id
content_sections.title
content_sections.content

includes_excludes.parent_entity_id
includes_excludes.type
includes_excludes.text_kr
```

## Double-check

- [ ] truly optional만 NULL
- [ ] 빈 문자열과 NULL 의미 구분

---

# 22. NULL vs Empty String

원칙:

```text
정보 없음 → NULL
실제 빈 문자열이 의미 있음 → ''
```

가능하면 빈 문자열 남발 금지.

## TODO

- [ ] seed 데이터의 빈 문자열 정리
- [ ] UI에서 NULL 안전 처리

---

# 23. Numeric 타입 최적화

기존 text에서 가능하면 숫자화.

예:

```text
product_reference_minutes → integer
min_minutes → integer
max_minutes → integer
distance_km → numeric
drive_minutes → integer
walk_minutes → integer
sort → integer
```

장점:

```text
정렬
필터
계산
range query
```

가능.

---

# 24. Text 유지할 것

다음은 text 유지가 맞음.

```text
주소
설명
질문
답변
운영시간 문자열
가격대
복장 안내
식사 안내
```

과도하게 파싱하지 않음.

---

# 25. JSONB 사용 기준

이번 구조에서는 JSONB를 기본으로 쓰지 않음.

JSONB는:

```text
비정형 metadata
외부 API raw payload
가변 옵션
```

처럼 정말 유연성이 필요한 경우만.

## 금지

```text
호텔 전체 정보를 jsonb 하나에 저장
```

이렇게 하면 검색/constraint/index가 어려워짐.

---

# 26. RLS 최적화

Public SELECT는:

```text
active=true
is_visible=true
```

정책.

Write는 client policy 없음.

## Double-check

- [ ] anon INSERT 차단
- [ ] anon UPDATE 차단
- [ ] anon DELETE 차단
- [ ] authenticated 전체 write 허용하지 않음
- [ ] service role server-only

---

# 27. RLS 성능

RLS policy 안의 `exists (...)`는 데이터가 커지면 비용이 생김.

현재 규모는 괜찮음.

데이터 커지면:

```text
entity active를 subtype에 duplicate
```

같은 역정규화보다 먼저 query plan 확인.

## TODO

- [ ] EXPLAIN ANALYZE로 policy 비용 확인
- [ ] premature denormalization 금지

---

# 28. DB View 고려

UI에서 반복 JOIN이 많으면 VIEW 유용.

예:

```text
v_golf_courses
v_hotels
v_restaurants
```

예:

```sql
select
  e.slug,
  e.display_name,
  e.area_id,
  e.active,
  e.sort,
  g.*
from entities e
join golf_courses g on g.entity_id=e.id
```

## 장점

- repository query 단순화
- mapping 중복 감소

## 주의

Admin write는 base table 사용.

---

# 29. Materialized View

현재는 필요 없음.

사용 조건:

```text
매우 무거운 집계
수십만 row
빈번한 read
드문 write
```

현재 CMS 규모에서는 과함.

---

# 30. Connection 관리

Supabase serverless 환경에서 connection 직접 열지 말고
Supabase client 사용.

DB direct connection을 쓴다면 pooler 사용.

## TODO

- [ ] Vercel에서 raw pg connection 난립 없음
- [ ] Supabase JS client 재사용

---

# 31. Caching 전략

DB가 빨라도 page cache는 필요할 수 있음.

하지만 관리자 수정 직후 stale cache 금지.

## 권장

사용자 read:

```text
짧은 revalidate
또는 tag cache
```

관리자 write 성공 후:

```text
revalidateTag
revalidatePath
```

정확한 범위 invalidate.

---

# 32. 캐시 금지 패턴

금지:

```text
15분 고정 TTL
+
admin update 후 invalidate 없음
```

금지:

```text
DB 실패 → stale cached data 무한 반환
```

---

# 33. Zustand Cache

client cache 사용 시:

```text
write success
→ relevant store update/invalidate
```

## Double-check

- [ ] DB와 local state 불일치 없음
- [ ] F5 후 동일 값

---

# 34. DB Error 처리

반드시:

```ts
const { data, error } = ...
if (error) throw ...
```

금지:

```text
error → []
```

## 로그

```text
operation
table
id/slug
error code
message
```

만.

secret 출력 금지.

---

# 35. Observability

Production 오류 추적을 위해 최소 로그 기준.

예:

```text
CMS_DB_UPDATE_FAIL
table=faq
id=...
code=...
```

## TODO

- [ ] debug console.log 제거
- [ ] error 로그만 구조화
- [ ] PII/secret 미출력

---

# 36. EXPLAIN ANALYZE

핵심 query는 production-like 데이터로 확인.

추천 대상:

```text
getGolfCourses
getHotels
getRestaurants
getFaqByCategory
getContentSections
getTravelTimes
```

## TODO

- [ ] sequential scan이 문제인지 확인
- [ ] index 사용 여부 확인
- [ ] query cost 기록

---

# 37. ANALYZE / VACUUM

Supabase/Postgres는 autovacuum 사용.

수동 VACUUM을 앱에서 실행하지 않음.

대량 seed/migration 후:

```sql
analyze;
```

실행 고려.

## TODO

- [ ] seed 완료 후 ANALYZE 실행
- [ ] autovacuum 설정 임의 변경 금지

---

# 38. 데이터 크기 점검

큰 text field가 많음.

목록 query에서:

```text
answer
course_summary
other_info
description
```

같은 큰 text를 불필요하게 select하지 않기.

---

# 39. API Payload 최적화

목록 API:

```text
작은 payload
```

상세 API:

```text
필요한 상세 field
```

## TODO

- [ ] 목록 payload 측정
- [ ] 불필요한 source_url/notes 제외

---

# 40. Frontend Fetch 병렬화

상세 페이지에서 독립 query:

```text
content_sections
faq
travel_times
restaurants
```

는 필요하면:

```ts
Promise.all(...)
```

사용.

단 query 개수가 과도하면 JOIN/view 재검토.

---

# 41. 관리자 Dropdown 최적화

dropdown은 full detail 필요 없음.

예:

```text
entities
select id, slug, display_name
```

만.

---

# 42. Search 최적화

향후 검색 기능 추가 시:

```text
ILIKE
```

만으로 커지면 느려짐.

필요 시:

```text
pg_trgm
GIN
```

고려.

현재는 미리 설치할 필요 없음.

## TODO

- [ ] 검색 기능 규모 확인 후 도입

---

# 43. Full Text Search

FAQ/콘텐츠 검색이 커지면:

```text
tsvector
GIN index
```

고려.

현재 작은 데이터에서는 과함.

---

# 44. Backup 전략

Google Sheet 대신 DB가 single source.

따라서 백업 중요.

Supabase 프로젝트 backup 기능 확인.

권장:

```text
정기 backup
migration SQL Git 관리
seed SQL 별도 보관
```

## TODO

- [ ] schema migration Git commit
- [ ] seed snapshot 보관
- [ ] production backup 상태 확인

---

# 45. Migration 관리

DB를 수동 SQL Editor에서만 수정하지 말고
migration file로 관리.

예:

```text
supabase/migrations/
20260909_initial_v2.sql
```

## TODO

- [ ] 현재 schema SQL migration 파일화
- [ ] 이후 ALTER TABLE도 migration 생성

---

# 46. Seed와 Migration 분리

원칙:

```text
schema migration
≠
seed data
```

운영 데이터 seed를 schema migration에 섞지 않음.

---

# 47. Constraint Naming

가능하면 constraint 이름 명시.

예:

```text
faq_scope_check
categories_group_type_check
```

디버깅 쉬움.

---

# 48. Default 값

추천:

```text
active true
sort 0
is_visible true
created_at now()
updated_at now()
```

앱에서 반복 전달하지 않아도 됨.

---

# 49. Boolean Null 방지

다음은 `NOT NULL` 권장:

```text
active
is_visible
navigation_visible
allows_specific_target
```

3-state boolean 필요 없음.

---

# 50. category allowed_entity_types

현재:

```text
text[]
```

사용.

작은 enum-like array라 괜찮음.

향후 복잡해지면 relation table 고려:

```text
category_entity_types
```

현재는 과도한 정규화 불필요.

---

# 51. locale / 다국어

현재 한국어/일본어만이면:

```text
*_kr
*_jp
```

유지 가능.

언어 3개 이상 확장 시 translation table 고려.

## TODO

- [ ] 다국어 확장 계획 확인
- [ ] 지금은 premature translation normalization 금지

---

# 52. category 동적 생성

카테고리 추가 시:

```text
categories INSERT
```

만.

DB schema 변경 금지.

---

# 53. entity type 추가

새 독립 entity:

```text
TOUR
ACTIVITY
SHOPPING
```

가 생길 경우:

1. entity_type CHECK 수정
2. subtype table 필요 여부 판단

카테고리 추가와 entity type 추가를 혼동하지 않음.

---

# 54. Data Integrity Checklist

- [ ] 모든 golf_courses.entity_id가 GOLF entity
- [ ] 모든 hotels.entity_id가 HOTEL entity
- [ ] 모든 restaurants.entity_id가 RESTAURANT entity
- [ ] FAQ SPECIFIC은 related_entity_id 필수
- [ ] travel_times from/to entity 존재
- [ ] content_sections parent entity 존재
- [ ] includes_excludes parent entity 존재

---

# 55. Entity Type 무결성 강화

Postgres FK만으로는:

```text
golf_courses.entity_id가 GOLF인지
```

까지는 검증 못함.

선택지:

1. app validation
2. trigger
3. subtype design 유지

현재 규모에서는 app validation + test 충분.

중요도가 높으면 trigger 추가 고려.

---

# 56. Repository Layer TODO

`src/lib/supabase-cms.ts`

에 다음 함수 집중.

- [ ] getAreas
- [ ] getAreaByCode
- [ ] getAreaCategories
- [ ] getCommonCategories
- [ ] getGolfCourses
- [ ] getGolfCourseBySlug
- [ ] getHotels
- [ ] getHotelBySlug
- [ ] getRestaurants
- [ ] getRestaurantBySlug
- [ ] getTravelTimes
- [ ] getFaqByCategory
- [ ] getContentSections
- [ ] getIncludesExcludes

Write:

- [ ] createCategory
- [ ] updateCategory
- [ ] disableCategory
- [ ] createGolf
- [ ] updateGolf
- [ ] disableGolf
- [ ] createHotel
- [ ] updateHotel
- [ ] disableHotel
- [ ] createRestaurant
- [ ] updateRestaurant
- [ ] disableRestaurant
- [ ] createFaq
- [ ] updateFaq
- [ ] delete/disableFaq
- [ ] createContentSection
- [ ] updateContentSection
- [ ] deleteContentSection
- [ ] createIncludeExclude
- [ ] updateIncludeExclude
- [ ] deleteIncludeExclude
- [ ] updateTravelTime

---

# 57. Query Double-Check Matrix

| Feature | Query Count | Index | N+1 | Result |
|---|---:|---|---|---|
| Main categories |  |  |  |  |
| Area page |  |  |  |  |
| Golf list |  |  |  |  |
| Golf detail |  |  |  |  |
| Hotel list |  |  |  |  |
| Hotel detail |  |  |  |  |
| Restaurant list |  |  |  |  |
| Restaurant detail |  |  |  |  |
| FAQ |  |  |  |  |
| Admin category |  |  |  |  |

---

# 58. CRUD Double-Check Matrix

| Feature | CREATE atomic | UPDATE persistent | DELETE policy | F5 | Concurrent |
|---|---|---|---|---|---|
| Category | | | | | |
| Golf | | | | | |
| Hotel | | | | | |
| Restaurant | | | | | |
| FAQ | | | | | |
| Content Section | | | | | |
| Includes/Excludes | | | | | |
| Travel Time | | | | | |

---

# 59. Performance TODO

- [ ] 목록 query에 `select('*')` 없음
- [ ] N+1 query 없음
- [ ] 핵심 WHERE/ORDER BY index 존재
- [ ] 관리자 dropdown 최소 컬럼
- [ ] 큰 text 목록 query에서 제외
- [ ] 필요 시 Promise.all 병렬화
- [ ] pagination 가능 구조
- [ ] sort batch update 고려
- [ ] RPC는 atomic 작업에만 사용

---

# 60. Security TODO

- [ ] service role server-only
- [ ] anon write 차단
- [ ] authenticated 전체 write 차단
- [ ] 관리자 server auth 검증
- [ ] secret log 없음
- [ ] RLS 정책 실제 테스트
- [ ] browser bundle에 service key 없음

---

# 61. Data Quality TODO

- [ ] NULL vs empty string 점검
- [ ] int 컬럼 text 값 없음
- [ ] 잘못된 category code 없음
- [ ] orphan FK 0
- [ ] duplicate slug 0
- [ ] duplicate category code 0
- [ ] invalid scope 0
- [ ] sort null 최소화
- [ ] active/is_visible null 0

---

# 62. Cache TODO

- [ ] Google Sheet TTL cache 제거
- [ ] DB read cache 전략 재설계
- [ ] admin write 후 invalidate
- [ ] stale F5 문제 없음
- [ ] Zustand cache sync
- [ ] force-dynamic 남발 없음

---

# 63. Migration TODO

- [ ] Google Sheets runtime read 0
- [ ] Google Sheets runtime write 0
- [ ] dual read 0
- [ ] dual write 0
- [ ] old env 참조 0
- [ ] old helper 참조 0
- [ ] schema migration Git 저장
- [ ] seed Git 저장
- [ ] production backup 확인

---

# 64. Production Smoke TODO

- [ ] `/`
- [ ] DOS
- [ ] BEPPU
- [ ] golf list
- [ ] golf detail
- [ ] hotel list
- [ ] hotel detail
- [ ] restaurant list
- [ ] restaurant detail
- [ ] guide/category
- [ ] admin login
- [ ] admin CRUD
- [ ] mobile 414x896
- [ ] F5 persistence
- [ ] 새 탭 persistence

---

# 65. EXPLAIN ANALYZE TODO

Agent는 가능하면 다음 query에 대해 확인.

- [ ] entities by area/type
- [ ] FAQ by area/category
- [ ] content_sections by parent
- [ ] travel_times by from/to
- [ ] restaurant_locations by near entity

확인:

```text
Index Scan / Bitmap Index Scan
vs
Sequential Scan
```

작은 테이블에서는 Seq Scan이 정상일 수 있으므로
무조건 문제라고 판단하지 마세요.

---

# 66. 완료 판정

아래를 모두 만족해야:

```text
DB_OPTIMIZATION_COMPLETE
```

판정 가능.

```text
[ ] FK 정상
[ ] index 정상
[ ] N+1 없음
[ ] CRUD atomic
[ ] F5 persistence
[ ] RLS 정상
[ ] service role 안전
[ ] stale cache 없음
[ ] orphan 0
[ ] build PASS
[ ] production smoke PASS
```

---

# 67. 최종 보고 형식

## Schema

```text
FK:
Indexes:
Constraints:
Triggers:
```

## Query Optimization

| Feature | Before | After | Query Count | Index |
|---|---|---|---:|---|

## Integrity

```text
Orphan FK:
Duplicate slug:
Duplicate category:
Invalid enum/check:
```

## Performance

```text
N+1:
Payload:
Pagination:
Batch update:
RPC:
```

## Cache

```text
Server cache:
Client cache:
Invalidation:
```

## Security

```text
RLS:
Anon write:
Service role:
Admin authorization:
```

## Quality Gates

```text
type-check:
lint:
build:
production smoke:
```

## Final Status

모든 항목 확인 후에만:

```text
DB_OPTIMIZATION_COMPLETE
```

---

# 68. 핵심 한 줄

이제 최적화 기준은:

```text
Google Sheet row 최적화
```

가 아니라:

```text
PostgreSQL 관계 무결성
+ 적절한 인덱스
+ 적은 query 수
+ atomic CRUD
+ 정확한 RLS
+ 올바른 cache invalidation
```

입니다.

Agent는 단순히 "DB 연결됨"으로 끝내지 말고,
이 문서의 TODO를 실제 코드와 Production에서 하나씩 체크하세요.

---

# 69. 실행 방식 — 1~68번 순차 완료 + 항목별 실시간 보고

이 문서의 **1번부터 68번까지 모든 항목을 하나도 빠짐없이 순서대로 수행**하세요.

단순 검토가 아니라 실제 코드 / DB / Production 상태를 확인하고 필요한 수정까지 수행해야 합니다.

## 필수 실행 규칙

```text
1번 수행
→ 검증
→ 필요한 수정
→ 재검증
→ 사용자에게 완료 보고
→ 다음 번호 진행
```

반드시 이 순서를 지키세요.

다음과 같이 여러 번호를 한꺼번에 묶어서:

```text
1~10 완료
11~20 완료
```

라고 보고하지 마세요.

**각 번호별로 1개씩 완료할 때마다 사용자에게 즉시 보고**하세요.

---

## 항목별 보고 형식

각 항목을 끝낼 때마다 아래 형식으로 보고하세요.

```text
[DB 최적화 진행상황]

완료: #<번호> <항목명>

수행 내용:
- 실제 확인한 내용
- 수정한 내용

검증:
- PASS / FAIL
- 검증 방법 또는 실제 결과

수정 파일/DB:
- 변경된 파일
- 변경된 migration / table / index / policy

현재 진행률:
<완료 개수>/68

다음:
#<다음 번호> <항목명>
```

예:

```text
[DB 최적화 진행상황]

완료: #8 Index 최적화

수행 내용:
- entities_area_type_active_sort_idx 확인
- faq_area_category_active_sort_idx 확인
- 누락된 categories_group_active_nav_sort_idx 추가

검증:
- PASS
- 핵심 조회 query에서 index 존재 확인

수정 파일/DB:
- supabase/migrations/20260909_add_cms_indexes.sql

현재 진행률:
8/68

다음:
#9 Partial Index 고려
```

---

## FAIL 발생 시

어떤 번호에서 문제가 발견되면:

```text
FAIL
→ Root Cause 분석
→ 수정
→ 재검증
→ PASS 확인
```

후에만 다음 번호로 넘어가세요.

FAIL 상태인데:

```text
추후 수정
PENDING
나중에 확인
```

으로 남겨두고 다음 번호로 넘어가면 안 됩니다.

단, 외부 권한/환경 변수/Production 접근 등 **Agent가 직접 해결할 수 없는 명확한 blocker**가 있는 경우에만 즉시 사용자에게 보고하고 진행을 멈추세요.

보고 형식:

```text
[BLOCKED]

번호:
#<번호>

원인:
...

필요한 사용자 조치:
...

현재 진행률:
.../68

다음 단계:
사용자 조치 후 #<번호>부터 재개
```

---

## 임의 SKIP 금지

다음 표현으로 항목을 생략하지 마세요.

```text
해당 없음
이미 되어 있음
기존 구현 사용
문제 없어 보임
```

이 경우에도 반드시 실제 확인 후:

```text
검증 완료
변경 불필요
PASS
```

라고 보고해야 합니다.

예:

```text
완료: #24 Text 유지할 것

수행 내용:
- 주소/설명/질문/답변/운영시간/가격대 필드 타입 확인
- text 유지가 적합한지 검증

검증:
- PASS
- 변경 불필요

현재 진행률:
24/68
```

---

## 실시간 보고 원칙

사용자에게 결과를 마지막에 한 번만 몰아서 보고하지 마세요.

**각 번호가 완료될 때마다 즉시 보고하고 다음 번호로 진행**하세요.

즉 작업 흐름은:

```text
#1 완료 보고
#2 완료 보고
#3 완료 보고
...
#68 완료 보고
```

이어야 합니다.

보고 없이 내부적으로 68개를 모두 처리한 뒤 마지막에 요약만 하는 방식은 금지합니다.

---

## 번호 순서 변경 금지

반드시:

```text
1
2
3
...
68
```

순서로 진행하세요.

Agent가 중요도를 판단해 순서를 임의 변경하지 마세요.

다른 이슈가 발견되더라도 현재 번호와 직접 관련이 없으면 기록만 하고,
1~68 체크가 끝난 뒤 별도 후속 작업으로 분리하세요.

---

## 각 번호의 완료 조건

각 번호는 아래 4가지가 모두 충족돼야 완료입니다.

```text
[ ] 코드/DB 실제 확인
[ ] 필요한 수정 적용
[ ] 실제 검증
[ ] 사용자에게 완료 보고
```

하나라도 빠지면 해당 번호는 완료가 아닙니다.

---

## 진행률 계산

현재 진행률은 반드시:

```text
완료한 번호 / 68
```

형식으로 표시하세요.

예:

```text
1/68
17/68
43/68
68/68
```

---

## 최종 #68 완료 후

#68까지 완료한 뒤에도 즉시 최종 종합보고를 추가하세요.

최종 보고:

```text
[DB 최적화 최종 보고]

진행률:
68/68 COMPLETE

Schema:
PASS/FAIL

Foreign Keys:
PASS/FAIL

Indexes:
PASS/FAIL

Constraints:
PASS/FAIL

RLS:
PASS/FAIL

Query Optimization:
PASS/FAIL

N+1:
PASS/FAIL

Atomic CRUD:
PASS/FAIL

Concurrency:
PASS/FAIL

Cache Invalidation:
PASS/FAIL

Data Integrity:
PASS/FAIL

Security:
PASS/FAIL

Production Smoke:
PASS/FAIL

type-check:
PASS/FAIL

lint:
PASS/FAIL

build:
PASS/FAIL
```

모든 필수 항목이 PASS인 경우에만:

```text
DB_OPTIMIZATION_COMPLETE
```

라고 최종 판정하세요.

---

# 70. Agent 실행 명령 — 반드시 준수

이 문서를 받은 즉시 다음 지시를 최우선 실행 규칙으로 사용하세요.

> `JAPAN_GUIDE_DB_OPTIMIZATION_TODO.md`의 #1부터 #68까지 모든 항목을 하나도 빠짐없이 순서대로 실제 수행하세요. 각 번호마다 코드/DB 확인 → 필요한 수정 → 재검증까지 완료한 뒤, **항목 하나가 끝날 때마다 즉시 사용자에게 해당 번호의 완료 결과를 실시간으로 보고**하세요. 여러 항목을 묶어서 보고하거나 마지막에 몰아서 보고하지 마세요. 각 보고에는 완료 번호, 수행 내용, 검증 결과, 수정 파일/DB, 현재 진행률 `<n>/68`, 다음 번호를 반드시 포함하세요. FAIL이면 해당 번호를 수정하여 PASS로 만든 뒤에만 다음 번호로 진행하세요. 직접 해결할 수 없는 blocker가 있을 때만 중단하고 사용자 조치를 요청하세요. #68 완료 후 전체 결과를 다시 종합 검증하고 모든 필수 항목이 PASS일 때만 `DB_OPTIMIZATION_COMPLETE`로 최종 보고하세요.
