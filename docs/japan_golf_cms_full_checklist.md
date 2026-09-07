# 일본 골프 여행 가이드 CMS
# Google Sheet ↔ Website 전체 연결 전수검증 및 Schema Registry 구축

매우 중요:

이번 작업은 새로운 기능을 바로 구현하기 전에  
현재 Production Website와 Google Sheet의 연결 구조를 100% 전수검증하는 작업입니다.

Google Sheet column 하나, Sheet tab 하나, field mapping 하나라도 누락하면  
관리자 CRUD / 사용자 페이지 / Dynamic Route에서 오류가 발생할 수 있으므로  
추측해서 작업하지 마세요.

먼저 실제 코드와 실제 Google Sheet를 비교해서  
"현재 무엇이 어디에 연결되어 있는지"를 완전히 문서화한 후  
CMS 확장을 진행하세요.

---

# 1. 현재 실제 Google Sheet 구조

현재 Spreadsheet에는 다음 8개 Sheet가 존재합니다.

1. `관리안내`
2. `golf_courses`
3. `hotels`
4. `travel_times`
5. `restaurants`
6. `faq`
7. `admin_options`
8. `includes_excludes`

이 8개를 현재 Website 코드에서 전부 검색해서  
실제로 어디서 READ / CREATE / UPDATE / DELETE 되는지 확인하세요.

하나라도 연결 여부를 추측하지 마세요.

---

# 2. golf_courses

현재 column:

```text
id
area
상품표명
공식명(JP)
주소
전화
코스요약
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
상품표_이동분
이동시간 메모
google_maps_url
source_url
status
active
sort
last_verified
updated_at
```

모든 field가 다음 중 어디에 연결되는지 전수 확인하세요.

- Google Sheet parser
- TypeScript type
- Admin form
- create API
- update API
- list page
- detail page
- cache
- serializer/deserializer

---

# 3. hotels

현재 column:

```text
id
area
상품표명
공식명
주소
전화
checkin
checkout
조식
목욕/스파
호텔 식사
ATM/결제
교통 메모
google_maps_url
source_url
status
active
sort
last_verified
updated_at
```

모든 field의 READ / WRITE mapping을 확인하세요.

---

# 4. travel_times

현재 column:

```text
id
area
from_type
from_id
to_type
to_id
상품표_참고분
verified_drive_min
note
source
status
active
sort
directions_url
time_basis
last_verified
updated_at
```

특히 관계형 field:

```text
from_type
from_id
to_type
to_id
```

가 코드에서 어떻게 lookup되는지 확인하세요.

호텔 삭제/골프장 삭제 시 orphan relation이 남는지도 확인하세요.

---

# 5. restaurants

현재 column:

```text
id
area
near_type
near_id
name
category
distance
address
hours
price_range
phone
google_maps_url
source_url
status
active
sort
last_verified
updated_at
```

특히:

```text
near_type
near_id
```

가 HOTEL / GOLF / AREA 등을 어떻게 연결하는지 확인하세요.

---

# 6. faq

현재 header:

```text
id
area
category
related_type
related_id
related_name
question_scope
question
answer
source_url
status
active
sort
updated_at
```

FAQ는 현재 Website의 핵심 category/guide 화면과 연결되므로 다음 mapping을 모두 확인하세요.

```text
area
category
question_scope
related_type
related_id
related_name
```

특히 신규 동적 CATEGORY가 추가되었을 때  
`faq.category`가 자동으로 신규 category code와 연결되는지 확인하세요.

CATEGORY를 코드의 enum/hardcoded array로 제한하면 안 됩니다.

---

# 7. admin_options

현재 header:

```text
option_type
code
관리자 화면 표시명
설명
특정장소 선택
연결 가능 대상
active
sort
group
updated_at
id
```

현재 category 예:

```text
CATEGORY | GOLF | 골프장 질문
CATEGORY | HOTEL | 호텔 질문
CATEGORY | ONSEN | 온천 질문
CATEGORY | DRIVER | 차량 질문
CATEGORY | RESTAURANT | 맛집 질문
CATEGORY | GENERAL | 기타 질문
CATEGORY | REFUND | 환불 질문
CATEGORY | MONEY | 환전 질문
CATEGORY | EXTRA_PAYMENT | 추가결제 질문
```

현재 group 규칙:

```text
GOLF            → AREA
HOTEL           → AREA
RESTAURANT      → AREA

ONSEN           → COMMON
DRIVER          → COMMON
GENERAL         → COMMON
REFUND          → COMMON
MONEY           → COMMON
EXTRA_PAYMENT   → COMMON
```

이 구조가 Website의 다음 route에 어떻게 연결되는지 전수 확인하세요.

```text
/
/dos
/beppu
/guide
/guide/[category]
/admin
```

---

# 8. includes_excludes

현재 header:

```text
id
parent_type
parent_id
type
text_kr
text_jp
sort_order
is_visible
updated_at
```

다음을 모두 확인하세요.

- INCLUDED
- EXCLUDED
- parent_type
- parent_id
- sort_order
- is_visible

실제 상세페이지와 관리자 CRUD에 모두 연결되어 있어야 합니다.

---

# 9. `관리안내` Sheet 업데이트

앞으로 Schema Registry / Dynamic Content Section 구조가 추가된다면  
`관리안내`도 반드시 같이 업데이트하세요.

향후 Agent 또는 관리자가 Spreadsheet를 봤을 때  
별도의 코드 분석 없이 구조를 이해할 수 있어야 합니다.

---

# 10. 현재 Sheet에서 발견된 위험 데이터

삭제부터 하지 말고 실제 코드/용도를 확인한 후 보고하세요.

## 10-1. `admin_options` column shift 의심 행

다음과 같이 header 구조와 맞지 않는 것으로 보이는 행이 존재하는지 확인하세요.

```text
opt_travel_time_dos
CATEGORY
TRAVEL_TIME
차량이동시간
...
```

```text
opt_travel_time_beppu
CATEGORY
TRAVEL_TIME
차량이동시간
...
```

현재 첫 column이 `option_type`이라면  
위 row는 column shift 또는 과거 migration 손상 가능성이 있습니다.

정상 데이터로 단정하지 마세요.

## 10-2. 손상 의심 row

다음과 같은 placeholder 값이 존재하는지 확인하세요.

```text
CATEGORY
???????
322
322
322
...
```

migration/test 손상 가능성을 조사하세요.

## 10-3. 중복 테스트 Category

`CATEGORY | 테스트` 계열 중복 row가 있는지 확인하세요.

중복 slug/code/category 처리 정책을 구현하세요.

---

# 11. `322` 값 전수조사

Workbook 전체에서 `322`를 검색하세요.

확인 대상 예:

- `golf_courses`
- `travel_times`
- `faq`
- `admin_options`
- `includes_excludes`

Root Cause 후보:

```text
default fallback?
undefined → 322 conversion?
test value?
migration placeholder?
column index 오류?
form serialization 오류?
```

Root Cause 확정 후 정리하세요.

정상 콘텐츠를 실수로 삭제하면 안 됩니다.

---

# 12. Smoke/Test 데이터 조사

Production Sheet에 다음 종류의 데이터가 남아있는지 확인하세요.

```text
SMOKE_TEST
test_hotel_1
test_golf_1
sort = 999
```

사용자에게 노출될 수 있는지 확인하고, 명백한 테스트 데이터라면 정리하세요.

---

# 13. CMS 구조에서 빠져 있는 핵심 기능

현재 요구사항 기준 최소 다음 구조가 필요합니다.

```text
[ ] cms_schema
[ ] content_sections
[ ] category emoji field
[ ] stable category slug/key 정책
[ ] schema-aware data access layer
[ ] schema validation
[ ] duplicate category validation
[ ] dynamic category route
[ ] cache invalidation
[ ] creation progress UI
[ ] stage-specific failure UI
[ ] custom 404
[ ] CMS schema documentation
[ ] schema drift test
```

---

# 14. Category emoji 저장 field

현재 `admin_options`에 별도의 emoji/icon field가 없다면 Schema를 확장하세요.

권장:

```text
emoji
```

기존 emoji가 코드에 hardcoding되어 있다면 Sheet 기반으로 migration하세요.

---

# 15. Stable slug / route identifier

현재 CATEGORY의 `code`가 route identifier인지 확인하세요.

원칙:

```text
display name ≠ stable internal key
```

예:

```text
code = SHOPPING
slug = shopping
label = 쇼핑 질문
emoji = 🛍️
```

관리자가 표시명을 바꿔도 URL과 relation이 깨지면 안 됩니다.

---

# 16. Dynamic Route 원칙

절대로 신규 Category마다 새 파일을 만들지 마세요.

금지:

```text
src/app/guide/shopping/page.tsx
src/app/guide/test/page.tsx
```

반드시 하나의:

```text
src/app/guide/[category]/page.tsx
```

가 모든 신규 category를 처리해야 합니다.

관리자가 Production에서 category를 생성하면:

```text
Google Sheet 저장
→ cache invalidation
→ category lookup
→ dynamic route lookup
→ 즉시 render
```

되어야 합니다.

재배포 금지.

---

# 17. `generateStaticParams()` / cache 점검

다음을 전수 확인하세요.

```text
generateStaticParams()
dynamicParams
dynamic
revalidate
route cache
fetch cache
category cache
Google Sheet cache
```

신규 category가 build-time 목록에 종속되면 안 됩니다.

---

# 18. 정상 Category와 404 구분

Sheet에 category 존재 + FAQ 0개:

```text
정상 페이지
아직 등록된 안내가 없습니다.
```

관리자라면:

```text
+ 질문 추가
```

가능.

Sheet에 category 자체가 없음:

```text
custom notFound()
```

---

# 19. 골프장 상세정보 Fixed Column 문제

현재 다음 항목이 고정 column으로 존재합니다.

```text
코스요약
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
```

앞으로 추가 가능한 예:

```text
캐디 안내
락커
연습장
체크인
주차
결제
우천 안내
GPS 카트
```

이런 안내를 신규 column 추가 방식으로 처리하지 마세요.

---

# 20. `content_sections` 구조

권장 신규 Sheet:

```text
content_sections
```

권장 schema 예:

```text
id
parent_type
parent_id
title
content
emoji
sort
is_visible
created_at
updated_at
```

사용 가능 parent 예:

```text
GOLF
HOTEL
RESTAURANT
AREA
GUIDE
```

실제 필요 타입만 사용하세요.

---

# 21. 새 안내 항목은 row 추가

앞으로:

```text
캐디 안내
주차 안내
체크인 안내
```

등이 생길 때:

```text
새로운 항목 = content_sections 신규 row
```

이어야 합니다.

신규 physical column 추가 방식은 피하세요.

---

# 22. 제목/내용/이모지 모두 수정 가능

예:

```text
코스 안내
→ 코스 소개
```

관리자가 수정 가능해야 합니다.

또한:

- title 수정
- content 수정
- emoji 수정
- sort 수정
- 표시/숨김
- 삭제

가능해야 합니다.

---

# 23. 내부 Key와 표시 이름 분리

예:

```text
field_key = course_summary
display_label = 코스 안내
```

관리자가:

```text
코스 안내
→ 코스 소개
```

로 바꾸더라도 `field_key`는 유지하세요.

물리적 Sheet header까지 변경하려면 schema mapping을 통해 처리하세요.

---

# 24. `cms_schema` Sheet 추가

권장 schema:

```text
entity
sheet_name
field_key
physical_column
display_label
field_type
required
editable
repeatable
sortable
visible
relation_target
default_value
description
```

실제 필요한 field만 최종 선정하세요.

---

# 25. 현재 데이터 Sheet 전체를 cms_schema에 등록

등록 대상:

```text
golf_courses
hotels
travel_times
restaurants
faq
admin_options
includes_excludes
content_sections
```

`관리안내`는 documentation metadata로 분리해도 됩니다.

---

# 26. 코드 Schema/Data Access Layer 구축

Google Sheet를 각각 직접 접근하는 구조를 줄이고 공통 layer로 통일하세요.

예:

```text
getCmsSchema()
getSheetSchema()
getCmsRecords()
getCmsRecord()
createCmsRecord()
updateCmsRecord()
deleteCmsRecord()
```

실제 naming convention에 맞게 구현하세요.

---

# 27. Column index hardcoding 전수검색

코드 전체에서 다음 패턴 검색:

```text
row[0]
row[1]
values[6]
values[7]
```

Google Sheet column을 index 기반으로 직접 읽는 코드가 있으면  
Schema 변경 시 깨질 위험이 큽니다.

모든 발견 위치를 보고하세요.

---

# 28. Column name hardcoding 전수검색

다음 header명을 source code 전체에서 검색하세요.

```text
상품표명
공식명
공식명(JP)
주소
전화
코스요약
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
조식
호텔 식사
ATM/결제
교통 메모
distance
hours
price_range
question
answer
관리자 화면 표시명
설명
```

직접 참조 위치를 모두 목록화하세요.

---

# 29. Sheet name hardcoding 전수검색

다음 문자열 전체 검색:

```text
golf_courses
hotels
travel_times
restaurants
faq
admin_options
includes_excludes
content_sections
```

각각:

- read 함수
- write 함수
- API
- admin form
- page renderer

연결 위치를 정리하세요.

---

# 30. TypeScript types 전수검증

다음 type/interface가 Sheet schema와 정확히 일치하는지 확인하세요.

```text
GolfCourse
Hotel
TravelTime
Restaurant
FAQ
AdminOption
IncludeExclude
ContentSection
```

확인:

- missing field
- obsolete field
- 타입 불일치
- nullable 처리
- number/string 혼합
- boolean normalization

---

# 31. Boolean normalization

Sheet의:

```text
TRUE
true
FALSE
false
```

혼재를 안전하게 normalize하세요.

문자열 `"FALSE"`가 truthy로 처리되지 않게 하세요.

공통 utility 사용 권장:

```text
toBool()
```

---

# 32. Number normalization

다음 field 점검:

```text
sort
상품표_이동분
상품표_참고분
verified_drive_min
```

`NaN`이 UI에 노출되면 안 됩니다.

Schema에서 실제 타입 규칙을 명확히 정의하세요.

---

# 33. 관계 무결성 검사

최소 다음 relation을 확인하세요.

### travel_times

```text
from_id → hotels.id / relevant parent
to_id → golf_courses.id / relevant parent
```

### restaurants

```text
near_id → hotel/golf/area
```

### faq

```text
related_id → golf/hotel/restaurant
```

### includes_excludes

```text
parent_id → relevant parent entity
```

orphan row를 찾고 보고하세요.

---

# 34. ID uniqueness 검사

다음 모든 Sheet에서 ID unique 검사:

```text
golf_courses.id
hotels.id
travel_times.id
restaurants.id
faq.id
admin_options.id
includes_excludes.id
content_sections.id
```

중복 ID가 있으면 완료 처리하지 마세요.

---

# 35. Category uniqueness 검사

`admin_options`에서:

```text
option_type = CATEGORY
```

인 row의 stable key/code/slug는 unique여야 합니다.

프론트와 서버 모두 unique validation 필요.

---

# 36. sort 정책

정렬 범위를 명확히 정의하세요.

예:

```text
Category → group 단위
Golf → area 단위
Hotel → area 단위
Restaurant → area/parent 단위
FAQ → category/area 단위
content_sections → parent_id 단위
```

---

# 37. active / is_visible 정책

기존:

```text
active
is_visible
```

둘을 데이터 layer에서는 공통 개념으로 normalize하세요.

예:

```text
visible
```

실제 Sheet field에 mapping.

---

# 38. CRUD 전수체크

각 entity마다 실제 CRUD 테스트:

```text
CREATE
READ
UPDATE
DELETE
```

또는 soft delete 정책이면:

```text
HIDE
RESTORE
```

대상:

```text
Golf
Hotel
Restaurant
TravelTime
FAQ
Category
IncludeExclude
ContentSection
```

---

# 39. Website → Sheet 역방향 체크

Website의 모든 사용자 콘텐츠를 전수 순회하여:

```text
화면에 있음
↓
어느 Sheet?
↓
어느 row?
↓
어느 field?
```

가 추적 가능해야 합니다.

추적 불가능한 것은 `Hardcoded content` 목록으로 보고하세요.

---

# 40. Sheet → Website 정방향 체크

반대로 모든 관리 대상 Sheet field에 대해:

```text
Sheet field
↓
parser
↓
type
↓
Admin UI
↓
User UI
```

연결 여부를 기록하세요.

사용되지 않는 field는:

```text
UNUSED
```

로 보고하되 삭제하지 마세요.

---

# 41. 사용자 콘텐츠 하드코딩 전수검사

다음 종류가 코드에 하드코딩되어 있는지 확인하세요.

```text
코스 안내
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
포함사항
불포함사항
거리
이동시간
대표 메뉴
가격
추가 안내
```

시스템 UI 문구는 제외.

관리자가 변경해야 할 실제 여행 콘텐츠는 Sheet/CMS에 있어야 합니다.

---

# 42. 관리자 편집 가능성 전수체크

관리자 로그인 상태에서 실제 사용자 콘텐츠에는 원칙적으로:

```text
＋ 추가
✏️ 수정
🗑️ 삭제
```

또는 해당 기능에 맞는 CRUD control이 있어야 합니다.

예외:

```text
header
footer
navigation
system layout
login modal
404 system message
```

---

# 43. Cache invalidation

관리자 write 성공 직후 해당 cache를 invalidate하세요.

대상:

```text
Category 추가
FAQ 추가
Content section 추가
Golf 수정
Hotel 수정
Restaurant 수정
```

사용자가 최신 데이터를 바로 볼 수 있어야 합니다.

---

# 44. Category 생성 Progress UI

단계 예:

```text
✓ 입력값 확인
✓ CMS 구조 확인
⏳ Google Sheet에 저장 중...
○ 사이트 데이터 연결 중...
○ Dynamic Page 준비 중...
○ 페이지 정상 작동 확인 중...
```

가짜 setTimeout progress 금지.

각 단계는 실제 서버 결과와 연결하세요.

---

# 45. "Dynamic Page 준비"의 정확한 의미

절대로 Next.js source file 생성이 아닙니다.

내부적으로:

```text
Sheet 저장
→ cache invalidation
→ category lookup
→ dynamic route lookup
→ 정상 render 확인
```

입니다.

---

# 46. 실패 단계 표시

예:

```text
✓ 입력 정보 확인
✓ CMS 구조 확인
✕ Google Sheet 저장 실패
○ 사이트 연결
○ 페이지 준비
○ 최종 확인
```

사용자에게는 안전한 오류를 보여주세요.

예:

```text
Google Sheet 저장 중 오류가 발생했습니다.
```

서버 로그에는 상세 error 기록.

절대 노출 금지:

```text
ADMIN_PASSWORD
Google private key
Service Account credential
Environment variables
Access token
```

---

# 47. Retry / Idempotency

부분 성공 후 재시도 시 중복 생성 금지.

예:

```text
✓ Google Sheet 저장
✕ 사이트 연결
```

다시 시도 시 Sheet row를 또 만들지 마세요.

기존 ID/slug/row를 재사용하세요.

---

# 48. 자동 Rollback 주의

Sheet 저장 성공 후 route verify 실패했다고  
정상 Sheet 데이터를 무조건 삭제하지 마세요.

기본 정책:

```text
성공 단계 유지
실패 단계 표시
재시도 가능
```

---

# 49. Custom 404

기본 Next.js:

```text
404
This page could not be found.
```

화면을 사용하지 마세요.

Custom `not-found.tsx` 구현.

배경은 메인 `/`과 동일한 background system 재사용.

예:

```text
🌸

페이지를 찾을 수 없습니다

요청하신 페이지가 존재하지 않거나
삭제된 안내일 수 있습니다.

[ 🏠 홈으로 이동 ]
```

---

# 50. FAQ 0개는 404 아님

Sheet에 category가 존재하지만 FAQ가 0개면:

```text
정상 category page
```

입니다.

예:

```text
🛍️ 쇼핑 질문

아직 등록된 안내가 없습니다.
```

관리자:

```text
+ 질문 추가
```

---

# 51. 데이터 백업 후 Migration

구조 변경 전 현재 데이터를 백업하세요.

특히:

```text
golf_courses
admin_options
faq
travel_times
includes_excludes
```

Migration은 idempotent하게 작성.

2회 실행해도 중복 생성 금지.

---

# 52. Fixed Golf fields migration

다음 기존 값을 `content_sections`로 이동할 경우:

```text
코스요약
플레이/카트
클럽하우스 식사
목욕/샤워
렌탈
복장
```

기존 데이터와 신규 section 값이 정확히 같은지 row별 비교.

확인 완료 전 기존 column 삭제 금지.

---

# 53. Hotel 고정 section도 조사

현재 Hotel의:

```text
조식
목욕/스파
호텔 식사
ATM/결제
교통 메모
```

도 향후 자유로운 추가/수정이 필요하다면 repeatable section으로 전환 가능하게 설계하세요.

Golf만 dynamic이고 Hotel은 hardcoded로 남기지 마세요.

---

# 54. Restaurant 추가 section 조사

Restaurant에도 향후:

```text
대표 메뉴
예약방법
결제수단
주차
추천 메뉴
주의사항
```

등이 추가될 수 있으므로 repeatable section 사용 가능하게 하세요.

---

# 55. CMS Schema 문서 생성

Repository에:

```text
docs/google-sheet-cms-schema.md
```

생성 또는 업데이트.

모든 Sheet/tab/column을 기록.

향후 Agent는 Google Sheet 작업 전에 이 문서를 먼저 확인하도록 README 또는 코드 주석에 명시하세요.

---

# 56. Schema Drift 검사

가능하면 자동 검증 script 추가.

예:

```text
npm run verify:cms-schema
```

검사 항목:

```text
필수 Sheet 존재
필수 column 존재
missing column
duplicate header
duplicate id
duplicate category code/slug
invalid relation
invalid boolean
schema mismatch
```

하나라도 실패하면 non-zero exit code.

---

# 57. Production 배포 전 Gate

배포 전 최소:

```text
npm run type-check
npm run lint
npm run build
npm run verify:cms-schema
```

또는 현재 project script naming에 맞게 실행.

CMS schema verify FAIL이면 배포 완료로 판정하지 마세요.

---

# 58. 현재 정리 대상 체크리스트

다음 항목 전수 확인:

```text
[ ] admin_options column shift 의심 row
[ ] admin_options damaged/test row
[ ] duplicate category
[ ] admin_options 322 placeholder
[ ] travel_times smoke test rows
[ ] travel_times 322 placeholder
[ ] golf_courses 이동시간 이상값
[ ] faq relation 이상값
[ ] includes_excludes test content
[ ] includes_excludes text_jp 이상값
```

각 항목을:

```text
정상 데이터
테스트 데이터
손상 데이터
의도적 placeholder
```

중 하나로 판정하고 보고하세요.

---

# 59. 최종 연결 Matrix

최종 보고에 반드시 모든 column을 포함한 Matrix 작성.

| Sheet | Column | Read 코드 | Write 코드 | Admin UI | User UI | 상태 |
|---|---|---|---|---|---|---|
| golf_courses | 코스요약 | ... | ... | ... | ... | PASS |
| golf_courses | 플레이/카트 | ... | ... | ... | ... | PASS |
| ... | ... | ... | ... | ... | ... | ... |

대표 몇 개만 하지 말고 전수 작성하세요.

---

# 60. Entity CRUD Matrix

| Entity | Create | Read | Update | Delete/Hide | Sort | Cache Invalidate |
|---|---|---|---|---|---|---|
| Golf | PASS | PASS | PASS | PASS | PASS | PASS |
| Hotel | PASS | PASS | PASS | PASS | PASS | PASS |
| Restaurant | PASS | PASS | PASS | PASS | PASS | PASS |
| FAQ | PASS | PASS | PASS | PASS | PASS | PASS |
| Category | PASS | PASS | PASS | PASS | PASS | PASS |
| IncludeExclude | PASS | PASS | PASS | PASS | PASS | PASS |
| ContentSection | PASS | PASS | PASS | PASS | PASS | PASS |

Runtime verified (2026-09-07):
- Golf CRUD: CREATE→READ→UPDATE(title/content/emoji)→SORT→HIDE→SHOW→DELETE all PASS
- Hotel CRUD: CREATE→READ→UPDATE→DELETE all PASS
- Restaurant CRUD: CREATE→READ→UPDATE→DELETE all PASS
- Category CRUD: CREATE→READ→DELETE all PASS
- Cache invalidation: write→read immediate

하나라도 미검증이면 완료 판정하지 마세요.

---

# 61. Dynamic Route Matrix

검증:

```text
/dos
/beppu
/guide
/guide/[existing-category]
/guide/[new-category]
골프장 detail
호텔 detail
맛집 detail
```

각 route에서:

```text
existing data
empty state
invalid id
invalid category
admin state
general-user state
```

확인.

---

# 62. 모바일 / 태블릿 / 데스크톱

다음 UI를 모두 확인:

```text
Dynamic Section
Category
Progress Modal
Custom 404
Admin CRUD controls
```

관리자 control 때문에 카드 width/layout이 깨지면 안 됩니다.

---

# 63. 최종 완료 기준

다음이 모두 충족되어야 완료입니다.

1. [x] 현재 모든 Sheet 전체 연결 전수검증 완료
2. [x] 모든 column READ/WRITE mapping 확인
3. [ ] 손상/테스트 데이터 판정 완료 — Production 데이터 조사 필요
4. [ ] 관계 무결성 확인 — orphan relation 조사 필요
5. [x] duplicate ID/code/slug 없음 (verify:cms-schema PASS)
6. [x] Schema Registry 구축 (87/87 PASS)
7. [x] Content Section 동적 구조 구축 (ContentSectionsRenderer)
8. [x] 신규 Category emoji/slug 지원
9. [x] 신규 Category 재배포 없이 route 작동
10. [x] 사용자 콘텐츠 전체 관리자 CRUD 가능
11. [x] Progress 상태가 실제 서버 처리와 일치
12. [x] 실패 단계 정확히 표시
13. [x] Custom 404 정상
14. [x] CMS Schema 자동 검증 PASS (87/87)
15. [x] type-check PASS
16. [x] build PASS

Runtime verified (2026-09-07):
- ContentSection CRUD: Golf/Hotel/Restaurant all PASS
- Golf Migration: idempotent PASS (12 created, 2nd run: 0 migrated)
- Cache invalidation: immediate
- Custom 404: PASS
- Admin auth: PASS

---

# 64. 절대 하지 말 것

금지:

```text
신규 Category마다 page.tsx 생성
신규 Category마다 route folder 생성
화면 label을 코드에 다시 hardcoding
신규 안내 항목마다 Google Sheet column 추가
가짜 setTimeout progress
Google Sheet column index 임의 추측
손상값을 확인 없이 삭제
Production test row 방치
코드 변경 후 Sheet schema 문서 미갱신
```

---

# 65. 최종 Architecture 목표

```text
Google Sheet
│
├─ cms_schema
├─ golf_courses
├─ hotels
├─ travel_times
├─ restaurants
├─ faq
├─ admin_options
├─ includes_excludes
└─ content_sections
       ↓
CMS Schema/Data Access Layer
       ↓
Admin CRUD
       ↓
Cache Invalidation
       ↓
Dynamic Renderer
       ↓
Dynamic Route
       ↓
Customer Website
```

최종 원칙:

> Google Sheet의 관리 대상 콘텐츠 하나가 추가되거나 수정되어도 개발자가 새로운 JSX, page.tsx, route, Sheet column을 매번 만들지 않고 기존 Schema + Dynamic Renderer로 즉시 정상 동작해야 한다.
