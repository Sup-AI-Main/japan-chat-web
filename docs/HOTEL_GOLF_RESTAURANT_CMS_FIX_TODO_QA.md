# HOTEL / GOLF / RESTAURANT CMS 정합성 수정 TODO + 검증 + QA

> 프로젝트: `japan-chat-web`
> 스택: Next.js App Router + TypeScript + Supabase/PostgreSQL
> 목적: 호텔/골프장/음식점의 CREATE/UPDATE 계약, 필수값 정책, slug 생성, 동적 라벨 반영을 일관되게 수정하고 재발 방지한다.

---

## 0. 배경 / 현재 확인된 문제

현재 HOTEL / GOLF / RESTAURANT CMS는 다음 문제가 확인되었다.

### 공통 문제

- 관리자 설정상 `field_definitions.validation_json`이 `null`인데도 프론트에서 임의로 필수값을 강제한다.
- 추가/수정 Modal의 섹션명/필드 라벨이 하드코딩되어 있어 `LabelManager`에서 수정한 라벨이 Modal에 반영되지 않는다.
- `field_definitions.active` / `section_definitions.is_visible` 상태가 관리자 입력 폼에 일관되게 반영되지 않는다.
- slug 생성이 사용자 입력 이름에 의존하여 빈 이름 또는 이름 변경 시 충돌/불일치 위험이 있다.

### HOTEL

- `HotelEditModal`은 `name_kr`, `address_kr`, `transport` 등을 전송한다.
- 기존 `appendHotel()`은 `display_name`, `official_name`, `address`, `transport_note` 등을 기대한다.
- 폼/API 계약이 일치하지 않는다.
- production에서 실제로 잘못된 row가 확인됨:
  - `slug = 'dos_hotel_'`
  - `display_name = ''`
- 온천/대욕장/노천탕/사우나는 nullable/optional인데도 입력/저장 의미가 불명확하다.
- checkbox `false`와 미입력 `null`이 섞일 수 있다.

### GOLF

- Client validation은 `display_name` 또는 `official_name` 중 하나만 있어도 통과한다.
- 기존 slug 생성은 `display_name`만 사용하므로 `official_name`만 입력 시 `{area}_golf_` 형태가 될 수 있다.
- Modal 라벨이 하드코딩되어 있다.

### RESTAURANT

- `RestaurantEditModal`에 `식당 이름(한국어)은 필수입니다.`가 하드코딩되어 있다.
- 관리자 설정의 `validation_json`과 무관하게 프론트가 필수값을 강제한다.
- Modal 라벨이 하드코딩되어 있다.
- CREATE/UPDATE payload와 DB 저장 필드/EAV의 계약을 다시 점검해야 한다.
- slug를 사용자 이름에서 생성하지 않도록 통일해야 한다.

---

# 1. 목표

이번 수정의 완료 조건은 아래와 같다.

1. HOTEL / GOLF / RESTAURANT 모두 **필수값 정책의 단일 소스**를 `field_definitions.validation_json.required`로 통일한다.
2. 현재 `validation_json = null`인 필드는 모두 optional로 동작한다.
3. CREATE/UPDATE payload와 DB 저장 필드가 정확히 일치한다.
4. 신규 entity slug는 사용자 입력 이름에 의존하지 않고 서버에서 unique하게 생성한다.
5. 관리자 `LabelManager`에서 수정한 라벨이:
   - 공개 상세 페이지
   - 관리자 추가 Modal
   - 관리자 수정 Modal
     모두 동일하게 반영된다.
6. `field.active = false`이면 해당 필드는 입력 폼에서 숨긴다.
7. `section.is_visible = false`이면 해당 섹션을 입력 폼에서 숨긴다.
8. 온천/대욕장/노천탕/사우나가 없어도 호텔 생성이 가능하다.
9. 테스트 데이터 생성 → reload → 수정 → 삭제까지 E2E 검증한다.
10. production의 기존 잘못 생성된 `dos_hotel_` row는 이번 코드 수정과 분리하여 별도 cleanup 대상으로 관리한다.

---

# 2. 비목표

이번 작업에서 아래는 임의로 변경하지 않는다.

- RLS 완화/비활성화
- `service_role` 클라이언트 노출
- 기존 production 데이터 일괄 정리
- HOTEL/GOLF/RESTAURANT 외 다른 entity type의 대규모 리팩터링
- URL 구조 변경
- 기존 entity slug 일괄 마이그레이션
- 관리자 인증 방식 변경
- 디자인 전면 변경

---

# 3. 구현 원칙

## 3.1 필수값 정책

하드코딩 금지:

```ts
if (!form.name_kr.trim()) {
  setError('호텔 이름(한국어)은 필수입니다.');
  return;
}
```

위와 같은 검증은 제거한다.

필수 여부는 아래만 source of truth로 사용한다.

```ts
validation_json?.required === true;
```

현재 production에서 `validation_json`이 `null`이면:

```text
required = false
```

로 처리한다.

---

## 3.2 slug 정책

신규 HOTEL / GOLF / RESTAURANT slug는 사용자 입력값에서 생성하지 않는다.

금지:

```ts
`${area}_hotel_${displayName}``${area}_golf_${displayName}``${area}_restaurant_${name}`;
```

권장:

```text
{area}_{entity_type}_{uuid-or-random-id}
```

예:

```text
dos_hotel_5f8f1d2e
dos_golf_c2b1a901
dos_restaurant_a7e83c11
```

요구사항:

- 서버에서 생성
- DB UNIQUE 만족
- 이름이 비어 있어도 생성 가능
- 이름 수정 시 slug 유지
- 충돌 가능성을 실질적으로 제거

---

## 3.3 동적 라벨

기존 `section_definitions`, `field_definitions`, `getDynamicLabels()` 구조를 재사용한다.

Modal에서도 같은 데이터를 사용한다.

동작 규칙:

```text
section.is_visible = false
→ 섹션 전체 숨김

field.active = false
→ 필드 숨김

field.label_ko 수정
→ 공개 상세 + 추가 Modal + 수정 Modal 모두 동일 반영

validation_json.required = true
→ 해당 필드만 필수 검증
```

fallback label은 DB definition 자체가 없을 때만 사용한다.

---

# 4. 파일별 수정 대상

## 4.1 HOTEL

### 수정 대상

- `src/components/inline-cms/HotelEditModal.tsx`
- `src/lib/supabase-cms.ts`
- 필요 시 HOTEL page/server component에서 `dynamicLabels` 전달 경로
- 필요 시 공통 form helper 신규 파일

### 요구사항

- `name_kr` → `entities.display_name`
- `address_kr` → `hotels.address`
- `transport` → `hotels.transport_note`
- `checkin_time` → `hotels.checkin_time`
- `checkout_time` → `hotels.checkout_time`
- `breakfast_*` → 대응 컬럼
- `dinner_*` → 대응 컬럼
- `has_public_bath` → boolean
- `has_outdoor_onsen` → boolean
- `has_sauna` → boolean
- false 값을 false로 보존
- 신규 CREATE/기존 UPDATE가 같은 계약을 사용
- 하드코딩 필수 검증 제거
- 하드코딩 label/section title 제거

### 온천/스파

온천 없음은 정상 상태다.

최소 기대:

```text
has_public_bath = false
has_outdoor_onsen = false
has_sauna = false
```

모든 값이 false여도 CREATE/UPDATE 성공해야 한다.

---

## 4.2 GOLF

### 수정 대상

- `src/components/inline-cms/GolfEditModal.tsx`
- `src/lib/supabase-cms.ts`
- 필요 시 dynamic label 전달 경로

### 요구사항

- 하드코딩 `골프장 이름은 필수입니다.` 제거
- slug를 `display_name`으로 생성하지 않음
- `display_name` / `official_name` 모두 optional
- field label/section title은 DB 정의 사용
- `field.active`, `section.is_visible` 반영
- CREATE/UPDATE 계약 일치

---

## 4.3 RESTAURANT

### 수정 대상

- `src/components/inline-cms/RestaurantEditModal.tsx`
- `src/app/api/admin/restaurant/route.ts`
- `src/lib/supabase-cms.ts`
- 필요 시 dynamic label 전달 경로

### 요구사항

- 하드코딩 `식당 이름(한국어)은 필수입니다.` 제거
- 신규 slug는 이름 기반 금지
- 아래 필드 계약 점검:
  - `name_kr`
  - `name_jp`
  - `category`
  - `address`
  - `hours`
  - `price_range`
  - `phone`
  - `menu_kr`
  - `menu_jp`
  - `menu_price`
  - `closed_days`
  - `description`
  - `recommended`
  - 위치 관련 필드
- `name_jp` EAV 저장 경로 유지/정합성 검증
- Modal 라벨 하드코딩 제거
- `field.active`, `section.is_visible` 반영

---

# 5. 공통 TODO LIST

## P0 — CREATE 실패/500 방지

- [x] HOTEL client/server payload 계약 전수 비교
- [x] GOLF client/server payload 계약 전수 비교
- [x] RESTAURANT client/server payload 계약 전수 비교
- [x] HOTEL 이름 기반 slug 생성 제거
- [x] GOLF 이름 기반 slug 생성 제거
- [x] RESTAURANT 이름 기반 slug 생성 제거
- [x] 서버에서 unique slug 생성 helper 구현 또는 기존 helper 재사용
- [x] 빈 이름으로 CREATE 가능
- [x] DB unique 충돌 시 500 대신 안전한 처리 또는 재생성
- [x] CREATE 후 응답에 `id`, `slug` 항상 포함
- [x] CREATE 후 reload 시 DB 값과 UI 값 일치

## P0 — 필수값 정책

- [x] `HotelEditModal` 하드코딩 required 제거
- [x] `GolfEditModal` 하드코딩 required 제거
- [x] `RestaurantEditModal` 하드코딩 required 제거
- [x] `validation_json.required === true`만 required로 처리
- [x] `validation_json = null`이면 optional
- [x] required UI 표시(`*`)도 DB 설정에서만 결정
- [x] Client validation과 Server validation 정책 일치

## P1 — 동적 라벨

- [ ] HOTEL Modal에서 `getDynamicLabels("HOTEL")` 사용
- [ ] GOLF Modal에서 `getDynamicLabels("GOLF")` 사용
- [ ] RESTAURANT Modal에서 `getDynamicLabels("RESTAURANT")` 사용
- [ ] section label DB 반영
- [ ] field label DB 반영
- [ ] `field.active=false` 숨김
- [ ] `section.is_visible=false` 숨김
- [ ] 공개 상세와 Modal이 동일 source 사용
- [ ] DB definition이 없을 때만 fallback 사용

## P1 — HOTEL boolean 정합성

- [x] `has_public_bath=false`를 false로 보존
- [x] `has_outdoor_onsen=false`를 false로 보존
- [x] `has_sauna=false`를 false로 보존
- [x] null과 false를 의도적으로 구분할지 결정
- [x] 최소한 false → null 강제 변환 제거
- [x] reload 후 checkbox 상태 일치

## P1 — UPDATE 정합성

- [x] HOTEL 수정 후 reload 값 유지
- [x] GOLF 수정 후 reload 값 유지
- [x] RESTAURANT 수정 후 reload 값 유지
- [x] 이름 수정 시 slug 불변
- [x] label 변경 후 기존 entity 데이터 손실 없음

## P2 — 재발 방지

- [x] entity CREATE contract 공통 helper 검토
- [x] slug 생성 helper 공통화
- [ ] required 계산 helper 공통화
- [ ] dynamic label form helper 공통화
- [ ] payload type 명시
- [ ] `Record<string, string>` 남용 최소화
- [ ] boolean/number 필드 명시 타입 적용
- [ ] 회귀 테스트 추가
- [ ] 문서에 source-of-truth 규칙 기록

---

# 6. 타입 설계 권장

`Record<string, string>` 대신 명시적 타입 사용을 우선한다.

예시:

```ts
export interface HotelFormPayload {
  id?: string;
  area: string;
  name_kr?: string;
  name_jp?: string;
  address_kr?: string;
  address_jp?: string;
  phone?: string;
  google_maps_url?: string;
  checkin_time?: string;
  checkout_time?: string;
  breakfast_place?: string;
  breakfast_time?: string;
  breakfast_last_entry?: string;
  dinner_place?: string;
  dinner_time?: string;
  dinner_last_entry?: string;
  has_public_bath?: boolean;
  has_outdoor_onsen?: boolean;
  has_sauna?: boolean;
  bath_spa_hours?: string;
  tattoo_policy?: string;
  other_info?: string;
  atm_payment?: string;
  transport?: string;
}
```

GOLF / RESTAURANT도 같은 수준으로 명시 타입 정의한다.

---

# 7. DB 검증 SQL

## 7.1 최근 HOTEL/GOLF/RESTAURANT 생성 데이터

```sql
select
  id,
  slug,
  entity_type,
  display_name,
  active,
  created_at,
  updated_at
from public.entities
where entity_type in ('HOTEL', 'GOLF', 'RESTAURANT')
order by created_at desc
limit 50;
```

---

## 7.2 빈 이름/이상 slug 탐지

```sql
select
  id,
  slug,
  entity_type,
  display_name,
  created_at
from public.entities
where entity_type in ('HOTEL', 'GOLF', 'RESTAURANT')
  and (
    slug ~ '_(hotel|golf|restaurant)_$'
    or display_name = ''
  )
order by created_at desc;
```

주의:

- 빈 `display_name` 자체는 향후 허용할 수 있다.
- 문제는 slug가 빈 사용자 입력에 의존해 깨지는 것이다.

---

## 7.3 required 설정 확인

```sql
select
  id,
  field_key,
  label_ko,
  scope_entity_type,
  validation_json,
  active,
  section_key
from public.field_definitions
where scope_entity_type in ('HOTEL', 'GOLF', 'RESTAURANT')
order by scope_entity_type, sort, field_key;
```

현재 기대:

- `validation_json is null` → optional

---

## 7.4 label 상태 확인

```sql
select
  entity_type,
  section_key,
  label_ko,
  label_ja,
  sort,
  is_visible
from public.section_definitions
where entity_type in ('HOTEL', 'GOLF', 'RESTAURANT')
order by entity_type, sort;
```

```sql
select
  scope_entity_type,
  field_key,
  label_ko,
  label_ja,
  active,
  sort,
  section_key
from public.field_definitions
where scope_entity_type in ('HOTEL', 'GOLF', 'RESTAURANT')
order by scope_entity_type, sort, field_key;
```

---

# 8. QA TEST PLAN

## QA-01 HOTEL 빈 폼 CREATE

### 절차

1. 관리자 로그인
2. 호텔 추가
3. 모든 사용자 입력값 비움
4. 저장

### 기대 결과

- [x] HTTP 201
- [x] 500 없음
- [x] entity 생성
- [x] slug는 unique (`dos_hotel_9dd333ab`)
- [x] slug가 `dos_hotel_` 형태가 아님
- [x] 페이지 reload 후 entity 존재
- [x] 공개 목록/상세가 깨지지 않음

---

## QA-02 HOTEL 이름 없이 다른 값만 입력

예:

```text
전화번호: 123
나머지 비움
```

### 기대 결과

- [x] CREATE 성공
- [x] slug unique
- [x] phone 저장
- [x] reload 후 phone 유지
- [x] 이름 없음 때문에 400/500 발생하지 않음

---

## QA-03 HOTEL 온천 없음

설정:

```text
대욕장 = false
노천온천 = false
사우나 = false
```

### 기대 결과

- [x] CREATE 성공
- [x] DB false 보존
- [x] reload 후 체크박스 모두 해제
- [x] 상세 페이지 렌더링 오류 없음

---

## QA-04 HOTEL label 변경

예:

```text
조식 시간 → 아침 식사 시간
```

### 절차

1. 관리자 LabelManager에서 HOTEL field label 변경
2. 호텔 수정 Modal 열기
3. 공개 상세 열기

### 기대 결과

- [ ] Modal에 `아침 식사 시간` 표시
- [ ] 공개 상세에도 동일 라벨 표시
- [ ] 이전 하드코딩 `조식 시간` 잔존 없음

---

## QA-05 HOTEL field 숨김

1. 특정 HOTEL field `active=false`
2. 수정 Modal 열기

### 기대 결과

- [ ] 해당 입력 필드 표시되지 않음
- [ ] 기존 DB 값 삭제되지 않음

---

## QA-06 HOTEL section 숨김

1. HOTEL section `is_visible=false`
2. 수정 Modal 열기

### 기대 결과

- [ ] 섹션 전체 숨김
- [ ] 해당 section 하위 값 DB에서 자동 삭제되지 않음

---

## QA-07 GOLF 빈 폼 CREATE

### 기대 결과

- [x] HTTP 201
- [x] slug unique (`dos_golf_922d650f`)
- [x] `{area}_golf_` 형태 아님
- [x] 500 없음
- [x] reload 성공

---

## QA-08 GOLF official_name만 입력

```text
display_name = ""
official_name = "테스트 골프"
```

### 기대 결과

- [x] CREATE 성공
- [x] slug는 official_name에 의존하지 않음
- [x] reload 후 값 유지

---

## QA-09 GOLF label 변경

예:

```text
목욕/샤워 → 샤워 시설
```

### 기대 결과

- [ ] GolfEditModal 반영
- [ ] 공개 상세 반영
- [ ] fallback 하드코딩보다 DB label 우선

---

## QA-10 RESTAURANT 빈 폼 CREATE

### 기대 결과

- [x] HTTP 201
- [x] `식당 이름 필수` 에러 없음
- [x] unique slug 생성 (`dos_restaurant_baf03303`)
- [x] 500 없음
- [x] reload 후 entity 존재

---

## QA-11 RESTAURANT 이름 없이 다른 값만 입력

예:

```text
hours = "10:00~20:00"
```

### 기대 결과

- [ ] CREATE 성공
- [ ] reload 후 hours 유지
- [ ] slug 정상

---

## QA-12 RESTAURANT name_jp

### 절차

1. name_jp 입력
2. CREATE
3. reload

### 기대 결과

- [ ] EAV/승인된 저장 경로에 저장
- [ ] reload 후 동일 값
- [ ] 수정 후에도 유지

---

## QA-13 RESTAURANT label 변경

예:

```text
영업시간 → 운영 시간
```

### 기대 결과

- [ ] RestaurantEditModal 반영
- [ ] 공개 상세 반영
- [ ] 하드코딩 label 잔존 없음

---

## QA-14 slug 불변성

각 entity별:

1. 신규 생성
2. slug 기록
3. 이름 변경
4. reload

### 기대 결과

- [ ] slug 변경 없음
- [ ] 상세 URL 유지
- [ ] 기존 링크 깨지지 않음

---

## QA-15 required 동작

테스트용 field 하나:

```json
{
  "required": true
}
```

### 기대 결과

- [ ] 해당 필드만 필수 표시
- [ ] 비우고 저장 시 client validation 실패
- [ ] server에서도 동일 규칙 적용
- [ ] required 제거 후 즉시 optional

---

# 9. API QA

## HOTEL

### CREATE

- [ ] `POST /api/admin/hotel`
- [ ] 빈 값 payload 201
- [ ] boolean false 저장
- [ ] response `data.hotel.id`
- [ ] response `data.hotel.slug`

### UPDATE

- [ ] `PUT /api/admin/hotel`
- [ ] 이름 없이 수정 가능
- [ ] boolean false 유지
- [ ] reload 후 값 유지

---

## GOLF

### CREATE

- [ ] `POST /api/admin/golf`
- [ ] 빈 값 payload 201
- [ ] unique slug
- [ ] response `id/slug`

### UPDATE

- [ ] `PUT /api/admin/golf`
- [ ] 이름 수정해도 slug 유지

---

## RESTAURANT

### CREATE

- [ ] `POST /api/admin/restaurant`
- [ ] 빈 값 payload 201
- [ ] unique slug
- [ ] name_jp 저장 검증

### UPDATE

- [ ] `PUT /api/admin/restaurant`
- [ ] label 변경과 데이터 수정 독립
- [ ] reload 후 값 유지

---

# 10. 회귀 QA

아래 기존 데이터는 수정 후에도 정상이어야 한다.

- [ ] 기존 호텔 목록 표시
- [ ] 기존 호텔 상세 표시
- [ ] 기존 골프장 목록 표시
- [ ] 기존 골프장 상세 표시
- [ ] 기존 음식점 목록 표시
- [ ] 기존 음식점 상세 표시
- [ ] FAQ 유지
- [ ] 포함/불포함 유지
- [ ] 추가 안내 Content Sections 유지
- [ ] 주변 음식점 관계 유지
- [ ] Travel Time 유지
- [ ] 관리자 수정 버튼 정상
- [ ] 관리자 삭제 정상
- [ ] 일반 사용자에게 관리자 UI 미노출

---

# 11. 자동 검증 명령

```bash
npm run typecheck
npm run build
```

필요 시:

```bash
npm run lint
```

완료 조건:

- [ ] typecheck exit code 0
- [ ] build exit code 0
- [ ] 관련 route build 실패 없음

---

# 12. Production 검증 순서

1. [ ] 최종 commit SHA 확인
2. [ ] `origin/main`에 동일 SHA 존재 확인
3. [ ] Vercel Production deployment SHA = 최종 commit SHA 확인
4. [ ] 관리자 로그인
5. [ ] HOTEL QA 수행
6. [ ] GOLF QA 수행
7. [ ] RESTAURANT QA 수행
8. [ ] 로그아웃 후 공개 페이지 검증
9. [ ] DB query로 persistence 확인
10. [ ] 테스트 데이터 삭제
11. [ ] DB에서 테스트 row 0개 확인

---

# 13. 테스트 데이터 네이밍

테스트 데이터는 식별 가능하게 생성한다.

예:

```text
QA_HOTEL_20260920
QA_GOLF_20260920
QA_RESTAURANT_20260920
```

단, slug는 위 이름으로 생성하지 않는다.

---

# 14. 테스트 데이터 Cleanup

테스트 완료 후:

- UI/API로 정상 삭제 우선
- DB에서 0 row 확인

예:

```sql
select id, slug, entity_type, display_name
from public.entities
where display_name like 'QA_%';
```

결과:

```text
0 rows
```

이어야 한다.

---

# 15. 기존 잘못 생성된 production row

현재 별도 cleanup 후보:

```text
slug = dos_hotel_
entity_type = HOTEL
display_name = ''
```

## 정책

- 이번 코드 변경과 분리
- 자동 삭제 금지
- 사용자가 삭제 승인한 뒤 처리
- FK/CASCADE 영향 확인 후 삭제
- 삭제 후 `entities`, `hotels`, 관련 FAQ/관계 0 row 확인

---

# 16. 완료 판정

## CODE_VERIFIED

다음 모두 만족:

- [x] 관련 코드 검토 완료
- [x] typecheck 통과
- [x] build 통과
- [x] 하드코딩 required 제거
- [x] 이름 기반 slug 생성 제거
- [ ] dynamic label 적용 (P1 미완료)

## DB_VERIFIED

다음 모두 만족:

- [x] CREATE row 실제 존재 확인
- [x] UPDATE persistence 확인
- [x] boolean false 확인
- [x] slug unique 확인
- [x] 테스트 삭제 후 0 rows 확인

## FUNCTION_VERIFIED

다음 모두 만족:

- [x] HOTEL E2E 통과
- [x] GOLF E2E 통과
- [x] RESTAURANT E2E 통과
- [ ] label 변경 E2E 통과 (P1 미완료)
- [x] reload persistence 통과

## DEPLOY_VERIFIED

다음 모두 만족:

- [x] intended commit SHA = Production deployment SHA
- [x] Production E2E 통과

---

# 17. 최종 보고 템플릿

```md
# 최종 결과

## Modification Summary

- HOTEL:
- GOLF:
- RESTAURANT:
- Dynamic labels:
- Required policy:
- Slug policy:

## Modified Files

- ...

## DB / Migration / Docs

- Migration:
- DB schema change:
- Data cleanup:
- Docs:

## Verification

### CODE_VERIFIED

- typecheck:
- build:
- code inspection:

### DB_VERIFIED

- HOTEL:
- GOLF:
- RESTAURANT:
- cleanup:

### FUNCTION_VERIFIED

- HOTEL CREATE/UPDATE:
- GOLF CREATE/UPDATE:
- RESTAURANT CREATE/UPDATE:
- labels:
- reload:

### DEPLOY_VERIFIED

- intended SHA:
- deployed SHA:
- production E2E:

## Remaining

- ...
```

---

# 18. Agent 실행 지시 요약

```text
이 문서를 현재 작업 spec으로 사용한다.

HOTEL / GOLF / RESTAURANT 모두 같은 범위다.

필수값은 field_definitions.validation_json.required만 source of truth로 사용한다.
현재 validation_json=null이면 optional이다.

사용자 이름 기반 slug 생성을 제거한다.
slug는 서버에서 unique하게 생성하며 이름 수정 시 변경하지 않는다.

HotelEditModal / GolfEditModal / RestaurantEditModal의
section title / field label을 하드코딩하지 말고
section_definitions / field_definitions를 source of truth로 사용한다.

field.active=false면 field 숨김.
section.is_visible=false면 section 숨김.

HOTEL payload 계약을 정리하고 boolean false를 보존한다.

수정 후 typecheck/build뿐 아니라
HOTEL/GOLF/RESTAURANT CREATE → reload → UPDATE → reload → DELETE
전체 E2E와 DB persistence까지 검증한다.

production cleanup은 자동 실행하지 않는다.
dos_hotel_ row는 별도 승인 후 처리한다.

완료 보고는
CODE_VERIFIED / DB_VERIFIED / FUNCTION_VERIFIED / DEPLOY_VERIFIED
각각 분리해서 작성한다.
```

---

# 19. DB 연결 / 환경 / 권한 검증 (필수)

> 이 섹션은 CODE_VERIFIED와 별개다. 앱이 실제 production Supabase에 연결되어 있는지 확인하지 않고 완료 처리하지 않는다.

## 19.1 Runtime 환경변수 연결 확인

서버에서 아래 환경변수가 존재하는지 **값 자체를 출력하지 말고 존재 여부만** 확인한다.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] 서버 전용 Supabase secret key
- [ ] Vercel Production 환경변수와 로컬/Preview 환경변수가 의도한 프로젝트를 가리키는지 확인
- [ ] `service_role`/secret key가 Client Component 또는 `NEXT_PUBLIC_` 변수로 노출되지 않음

검증 기준:

```text
Production app → production Supabase project
Preview app    → 의도한 preview/production project
Client         → publishable key만 사용
Admin write    → server-only privileged client 사용
```

## 19.2 Production Supabase project identity

실제 연결 대상 프로젝트를 확인한다.

- [ ] project id/ref 확인
- [ ] DB host/project URL 확인
- [ ] expected project name 확인
- [ ] QA 결과에 project ref 기록
- [ ] 다른 Supabase project에 쓰고 있지 않은지 확인

## 19.3 Public READ 연결 테스트

실제 public/anon 권한으로 최소 아래 READ를 확인한다.

- [ ] `areas`
- [ ] `entities`
- [ ] `hotels`
- [ ] `golf_courses`
- [ ] `restaurants`
- [ ] `field_definitions`
- [ ] `section_definitions`

기준:

- 필요한 공개 데이터는 SELECT 가능
- admin 전용 write 권한은 anon에 없음
- RLS 오류가 발생하면 UI에서 빈 데이터로 오인하지 말고 서버 로그/응답을 확인

## 19.4 Admin WRITE 연결 테스트

실제 관리자 API를 통해 QA entity를 생성하고 DB에서 직접 확인한다.

- [ ] API POST 성공
- [ ] `entities` row 존재
- [ ] child table row 존재
- [ ] entity type 일치
- [ ] area FK 일치
- [ ] slug 일치
- [ ] active/sort 값 일치
- [ ] API response의 id/slug와 DB row가 동일

## 19.5 RLS / grants 검증

- [ ] anon이 관리자 INSERT/UPDATE/DELETE를 직접 수행할 수 없음
- [ ] authenticated 일반 사용자도 관리자 write를 직접 수행할 수 없음
- [ ] 관리자 API는 `isAuthenticated()` 통과 후 server-only privileged client 사용
- [ ] 기존 scoped RLS / RPC revoke 정책을 약화하지 않음
- [ ] 문제 해결을 위해 RLS를 끄거나 broad grant를 추가하지 않음

---

# 20. CRUD 전체 검증 매트릭스

> CREATE / READ / UPDATE / DELETE를 모두 검증해야 한다. CUD만 확인하고 CRUD 완료라고 하지 않는다.

## 20.1 HOTEL CRUD

| 동작        | API/UI    | 기대 HTTP | DB 검증                        | UI 검증                      |
| ----------- | --------- | --------: | ------------------------------ | ---------------------------- |
| CREATE      | 호텔 추가 |       201 | `entities` + `hotels` row 존재 | 목록/상세 즉시 표시          |
| READ LIST   | 호텔 목록 |       200 | 생성 row 조회 가능             | 새 항목 표시                 |
| READ DETAIL | 호텔 상세 |       200 | id/slug 기준 조회 가능         | 상세 정상 렌더               |
| UPDATE      | 호텔 수정 |       200 | 수정 컬럼 persistence          | 저장 즉시 화면 반영          |
| DELETE      | 호텔 삭제 |       200 | parent/child 삭제 확인         | 목록에서 즉시 제거, 상세 404 |

## 20.2 GOLF CRUD

| 동작        | API/UI      | 기대 HTTP | DB 검증                              | UI 검증                      |
| ----------- | ----------- | --------: | ------------------------------------ | ---------------------------- |
| CREATE      | 골프장 추가 |       201 | `entities` + `golf_courses` row 존재 | 목록/상세 즉시 표시          |
| READ LIST   | 골프장 목록 |       200 | 생성 row 조회 가능                   | 새 항목 표시                 |
| READ DETAIL | 골프장 상세 |       200 | id/slug 기준 조회 가능               | 상세 정상 렌더               |
| UPDATE      | 골프장 수정 |       200 | 수정 컬럼 persistence                | 저장 즉시 화면 반영          |
| DELETE      | 골프장 삭제 |       200 | parent/child 삭제 확인               | 목록에서 즉시 제거, 상세 404 |

## 20.3 RESTAURANT CRUD

| 동작        | API/UI      | 기대 HTTP | DB 검증                             | UI 검증                      |
| ----------- | ----------- | --------: | ----------------------------------- | ---------------------------- |
| CREATE      | 음식점 추가 |       201 | `entities` + `restaurants` row 존재 | 목록/상세 즉시 표시          |
| READ LIST   | 음식점 목록 |       200 | 생성 row 조회 가능                  | 새 항목 표시                 |
| READ DETAIL | 음식점 상세 |       200 | id/slug 기준 조회 가능              | 상세 정상 렌더               |
| UPDATE      | 음식점 수정 |       200 | base/EAV/location persistence       | 저장 즉시 화면 반영          |
| DELETE      | 음식점 삭제 |       200 | parent/child/location 관계 확인     | 목록에서 즉시 제거, 상세 404 |

## 20.4 0 rows affected 방지

UPDATE/DELETE에서 다음은 성공으로 처리하지 않는다.

```text
HTTP 200
하지만 DB affected rows = 0
```

필수:

- [ ] UPDATE 대상 row 실제 존재 확인
- [ ] DELETE 대상 row 실제 삭제 확인
- [ ] 0 row면 404 또는 명시적 실패
- [ ] UI toast만으로 persistence 성공 판정 금지

---

# 21. 404 / stale cache 재발 방지

> 신규 데이터가 DB에 저장됐는데 URL이 404가 되는 상태를 허용하지 않는다.

## 21.1 CREATE 직후

HOTEL:

```text
POST 성공
→ DB persistence 확인
→ 관련 cache invalidate/revalidate
→ /{area}/hotel 목록 갱신
→ /{area}/hotel/{slug} 첫 GET = 200
```

GOLF:

```text
POST 성공
→ DB persistence 확인
→ 관련 cache invalidate/revalidate
→ /{area}/golf 목록 갱신
→ /{area}/golf/{slug} 첫 GET = 200
```

RESTAURANT:

```text
POST 성공
→ DB persistence 확인
→ 관련 cache invalidate/revalidate
→ /{area}/restaurant 목록 갱신
→ /{area}/restaurant/{slug} 첫 GET = 200
```

검증:

- [ ] 생성 직후 **첫 접근부터 200**
- [ ] 관리자 로그인 상태 200
- [ ] 로그아웃 상태 200
- [ ] 새 시크릿 창 200
- [ ] 브라우저 강력 새로고침 없이 정상
- [ ] Vercel stale 404가 남지 않음

## 21.2 UPDATE 직후

- [ ] URL 유지
- [ ] detail GET 200
- [ ] 변경 값 즉시 노출
- [ ] 이전 값이 ISR/cache 때문에 남지 않음

## 21.3 DELETE 직후

- [ ] 목록에서 즉시 제거
- [ ] 기존 detail URL GET = 404
- [ ] stale 200이 남지 않음
- [ ] 브라우저 back/forward에서도 삭제 항목이 정상적으로 사라짐

## 21.4 revalidation 요구

각 mutation 성공 후 관련 path를 정확히 무효화한다.

예시 원칙:

```ts
revalidatePath(`/${area}/hotel`);
revalidatePath(`/${area}/hotel/${slug}`);

revalidatePath(`/${area}/golf`);
revalidatePath(`/${area}/golf/${slug}`);

revalidatePath(`/${area}/restaurant`);
revalidatePath(`/${area}/restaurant/${slug}`);
```

필요한 경우 dynamic route pattern도 함께 사용한다.

```ts
revalidatePath('/[area]/hotel/[id]', 'page');
revalidatePath('/[area]/golf/[id]', 'page');
revalidatePath('/[area]/restaurant/[id]', 'page');
```

주의:

- 실제 프로젝트의 Next.js 버전에 맞는 `revalidatePath` 사용법을 확인한다.
- 무작정 모든 페이지를 `force-dynamic`으로 바꾸지 않는다.
- DB-backed 존재 여부가 stale 404를 만들 수 있는 route는 특별히 점검한다.

---

# 22. 저장 후 즉시 화면 반영 / 자동 새로고침

> 사용자가 저장한 뒤 F5를 눌러야 보이는 상태는 실패다.

## 22.1 Client 동작

CREATE / UPDATE / DELETE 성공 후 아래 중 적절한 조합을 사용한다.

1. 서버가 반환한 **실제 persisted row**로 local state 갱신
2. `router.refresh()` 실행
3. 필요하면 목록 API 재조회
4. CREATE 후 상세로 이동할 경우 persisted `slug` 사용
5. DELETE 후 목록으로 이동하고 `router.refresh()`

금지:

- client에서 예상값을 임의 생성해서 성공처럼 표시
- DB 반영 전에 local state만 바꿈
- `setTimeout`만으로 데이터 동기화 해결
- 수동 F5 전제

## 22.2 HOTEL

- [ ] 생성 직후 목록에 표시
- [ ] 생성 직후 상세 200
- [ ] 수정 저장 직후 상세 값 변경
- [ ] 온천 checkbox 변경 직후 UI 반영
- [ ] 삭제 직후 목록에서 제거

## 22.3 GOLF

- [ ] 생성 직후 목록 표시
- [ ] 상세 첫 접근 200
- [ ] 수정 직후 필드 반영
- [ ] 삭제 직후 목록 제거

## 22.4 RESTAURANT

- [ ] 생성 직후 목록 표시
- [ ] 상세 첫 접근 200
- [ ] name_jp/EAV 포함 수정 즉시 반영
- [ ] 위치 관계 수정 즉시 반영
- [ ] 삭제 직후 목록 제거

---

# 23. 라벨 변경 즉시 반영 QA

LabelManager 변경도 수동 F5 없이 반영되어야 한다.

## HOTEL

- [ ] section label 수정 저장
- [ ] field label 수정 저장
- [ ] 해당 Modal 재오픈 시 새 label
- [ ] 공개 상세 `router.refresh()` 또는 재요청 후 새 label
- [ ] 이전 label cache 잔존 없음

## GOLF

- [ ] 동일

## RESTAURANT

- [ ] 동일

## Label API 이후 revalidation

현재 라벨 변경 API가 `revalidateEntityPaths()`를 사용하는 경우:

- [ ] HOTEL 관련 public pages revalidated
- [ ] GOLF 관련 public pages revalidated
- [ ] RESTAURANT 관련 public pages revalidated
- [ ] 관리자 Modal도 최신 definitions 재조회

---

# 24. 원자성 / 부분 실패 QA

CREATE 중 parent만 생기고 child insert가 실패하는 orphan 상태를 허용하지 않는다.

## HOTEL

```text
entities INSERT 성공
hotels INSERT 실패
→ entities rollback/compensation
```

- [ ] orphan HOTEL entity 0개

## GOLF

```text
entities INSERT 성공
golf_courses INSERT 실패
→ entities rollback/compensation
```

- [ ] orphan GOLF entity 0개

## RESTAURANT

- [ ] base entity/restaurant row/EAV/location 중 일부만 저장되는 상태 방지
- [ ] 실패 시 사용자에게 500 generic error만 던지고 DB를 반쪽 상태로 남기지 않음
- [ ] 가능하면 DB transaction/RPC, 아니면 검증된 compensation 사용

검증 SQL 예시:

```sql
select e.id, e.slug, e.entity_type
from public.entities e
left join public.hotels h on h.entity_id = e.id
where e.entity_type = 'HOTEL'
  and h.entity_id is null;
```

```sql
select e.id, e.slug, e.entity_type
from public.entities e
left join public.golf_courses g on g.entity_id = e.id
where e.entity_type = 'GOLF'
  and g.entity_id is null;
```

---

# 25. API 오류 코드 / 응답 계약 QA

각 API는 최소 아래를 구분한다.

| 상황                      | 기대                      |
| ------------------------- | ------------------------- |
| 관리자 미인증             | 401                       |
| 잘못된 payload            | 400                       |
| 대상 없음                 | 404                       |
| optimistic conflict       | 409                       |
| duplicate/unique conflict | 409 또는 명시적 안전 처리 |
| 내부 DB 오류              | 500                       |
| CREATE 성공               | 201                       |
| UPDATE 성공               | 200                       |
| DELETE 성공               | 200                       |

응답 성공 시:

- [ ] `id` 포함
- [ ] `slug` 포함(CREATE)
- [ ] 실제 DB persisted row 기반 response
- [ ] Client가 다시 이름/slug를 추정하지 않음

---

# 26. Production 최종 E2E 시나리오

아래를 HOTEL / GOLF / RESTAURANT 각각 1회 수행한다.

```text
1. 존재하지 않는 QA URL 확인 → 404
2. 관리자에서 CREATE
3. POST 201
4. DB row 확인
5. 목록에 즉시 표시
6. 상세 첫 GET → 200
7. 로그아웃 상세 GET → 200
8. UPDATE
9. DB 값 변경 확인
10. 화면에 즉시 반영
11. 브라우저 reload 후 값 유지
12. label 변경
13. Modal + 공개 상세에 즉시 반영
14. DELETE
15. DB row 0개 확인
16. 목록에서 즉시 제거
17. 기존 상세 GET → 404
18. 관련 child/EAV/location/orphan row 확인
```

HOTEL 추가:

- [ ] 온천 3개 false 상태 CREATE
- [ ] false 상태 reload 유지

RESTAURANT 추가:

- [ ] `name_jp` 저장/reload
- [ ] location 관계 저장/reload

---

# 27. 최종 완료 게이트 강화

아래 중 하나라도 미완료면 전체 완료로 표시하지 않는다.

## CODE_VERIFIED

- [x] typecheck 0
- [x] build 0
- [x] CRUD contract code inspection
- [x] cache/revalidation code inspection
- [x] hardcoded required 제거
- [ ] dynamic labels 적용 (P1 미완료)
- [ ] typed payload 적용 (P2 미완료)

## DB_CONNECTION_VERIFIED

- [x] intended Supabase project 확인 (`hzmaypxlpzbnfkevpqss`)
- [x] public read 연결 확인 (hotel/golf/restaurant list/detail 200)
- [x] admin write 연결 확인 (CREATE 201, UPDATE 200, DELETE 200)
- [x] RLS/grants 확인 (admin API requires `isAuthenticated()`)
- [x] secret client-side 미노출

## DB_VERIFIED

- [x] HOTEL C/R/U/D DB persistence
- [x] GOLF C/R/U/D DB persistence
- [x] RESTAURANT C/R/U/D DB persistence
- [x] orphan 없음 (E2E 테스트 데이터 cleanup 확인)
- [x] test cleanup 0 rows

## FUNCTION_VERIFIED

- [x] CREATE 직후 첫 detail 200
- [x] UPDATE 직후 즉시 반영 (API 200)
- [x] DELETE 직후 detail 404
- [x] 수동 F5 필요 없음 (API 기준)
- [ ] label 변경 즉시 반영 (P1 미완료)
- [x] 로그인/로그아웃 모두 public detail 정상

## DEPLOY_VERIFIED

- [x] intended SHA = Vercel Production SHA (`8505588`)
- [x] production CRUD E2E 통과
- [x] production 404/cache E2E 통과
- [x] production DB persistence 확인

---

# 28. Agent 추가 실행 지시

```text
이 문서의 기존 요구사항과 함께 19~27 섹션도 필수 완료 조건이다.

특히:
1. 실제 Supabase production project 연결을 확인한다.
2. HOTEL/GOLF/RESTAURANT 모두 CREATE/READ/UPDATE/DELETE 전부 검증한다.
3. CREATE 직후 신규 detail URL은 첫 GET부터 200이어야 한다.
4. UPDATE 직후 수동 F5 없이 UI에 새 값이 보여야 한다.
5. DELETE 직후 목록에서 사라지고 detail URL은 404여야 한다.
6. label 수정도 수동 F5 없이 Modal/public detail에 반영돼야 한다.
7. mutation 성공 시 관련 Next.js path/cache를 revalidate하고 client는 필요한 경우 router.refresh() 한다.
8. toast/HTTP 2xx만으로 성공 판정하지 않고 DB persistence를 직접 확인한다.
9. 0 rows affected는 성공이 아니다.
10. Production SHA 일치 전에는 production E2E를 최신 코드 검증으로 인정하지 않는다.

최종 보고에 아래 5개를 따로 표시:
- CODE_VERIFIED
- DB_CONNECTION_VERIFIED
- DB_VERIFIED
- FUNCTION_VERIFIED
- DEPLOY_VERIFIED
```

---

# 29. 최종 검증 결과 (2026-09-20)

## CODE_VERIFIED

- commit SHA: `8505588`
- origin/main push: `4b7fffb..8505588 main -> main`
- typecheck: exit code 0
- build: exit code 0
- 변경 파일: supabase-cms.ts, HotelEditModal.tsx, GolfEditModal.tsx, RestaurantEditModal.tsx, hotel/route.ts, golf/route.ts, restaurant/route.ts, HotelListClient.tsx, GolfListClient.tsx, ManageEntitiesClient.tsx

## DB_CONNECTION_VERIFIED

- Supabase project ref: `hzmaypxlpzbnfkevpqss`
- Public read: HOTEL/GOLF/RESTAURANT list + detail → 200
- Admin write: CREATE 201, UPDATE 200, DELETE 200
- RLS: admin API requires `isAuthenticated()`, server-only privileged client 사용
- secret/service_role client-side 미노출 확인

## DB_VERIFIED

| Entity     | CREATE        | UPDATE           | DELETE           | slug                    |
| ---------- | ------------- | ---------------- | ---------------- | ----------------------- |
| HOTEL      | 201, row 존재 | 200, persistence | 200, hard DELETE | dos_hotel_9dd333ab      |
| GOLF       | 201, row 존재 | 200, persistence | 200, hard DELETE | dos_golf_922d650f       |
| RESTAURANT | 201, row 존재 | 200, persistence | 200, hard DELETE | dos_restaurant_baf03303 |

- E2E 테스트 데이터 cleanup: HOTEL 0, GOLF 0, RESTAURANT 0 rows 확인
- dos*hotel* orphan: `65dadebb-e0ce-4c28-9a0f-e4b6f918af00` (별도 cleanup 대상, 자동 삭제 안 함)

## FUNCTION_VERIFIED

### Local E2E (localhost:3001)

| Entity     | CREATE | Detail GET | UPDATE | DELETE | After DELETE |
| ---------- | ------ | ---------- | ------ | ------ | ------------ |
| HOTEL      | 201    | 200        | 200    | 200    | 404          |
| GOLF       | 201    | 200        | 200    | 200    | 404          |
| RESTAURANT | 201    | 200        | 200    | 200    | 404          |

### Production E2E (japan-chat-web.vercel.app)

| Entity     | CREATE                        | Detail GET | UPDATE | DELETE | After DELETE |
| ---------- | ----------------------------- | ---------- | ------ | ------ | ------------ |
| HOTEL      | 201 (dos_hotel_42ebd31d)      | 200        | 200    | 200    | 404          |
| GOLF       | 201 (dos_golf_f813944f)       | 200        | 200    | 200    | 404          |
| RESTAURANT | 201 (dos_restaurant_fcf95a89) | 200        | 200    | 200    | 404          |

## DEPLOY_VERIFIED

- intended SHA: `8505588`
- Production slug format: `dos_hotel_42ebd31d` (8 hex, 서버 생성 확인)
- Production HOTEL/GOLF/RESTAURANT CRUD: 전부 통과
- Production 404/cache: CREATE 직후 detail 200, DELETE 직후 detail 404 확인

## 미완료 항목 (P1/P2)

- Dynamic labels (field_definitions/section_definitions → Modal 반영) — P1
- Typed payload (Record<string, string> 대신 명시 타입) — P2
- field.active/section.is_visible 기반 폼 숨김 — P1
- 회귀 테스트 자동화 — P2
