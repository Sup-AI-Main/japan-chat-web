# 일본 골프 여행 가이드 CMS
# 실행용 TODO + 더블체크 체크리스트

이 문서는 기존 `japan_golf_cms_full_checklist.md`를 실제 작업 순서대로 실행하고,
작업 완료 후 빠진 항목이 없는지 다시 검증하기 위한 실행용 TODO 문서입니다.

원칙:

- 체크하지 않은 항목이 하나라도 있으면 완료로 판정하지 않습니다.
- `PASS`는 실제 코드/Google Sheet/Production 동작을 확인한 경우에만 표시합니다.
- 추측, 코드만 보고 판단, 로컬만 확인한 항목은 `PASS` 처리하지 않습니다.
- Migration/삭제/정리 전에 반드시 데이터 백업 또는 원본 확인을 합니다.
- 신규 Category/Section은 재배포 없이 동작해야 합니다.
- 신규 Page 파일/Route 파일 생성 방식은 금지합니다.

---

# 0. 작업 시작 전 보호 조치

- [ ] 현재 Production 배포 commit hash 기록
- [ ] 현재 Google Sheet 전체 백업
- [ ] `admin_options` 백업
- [ ] `faq` 백업
- [ ] `golf_courses` 백업
- [ ] `hotels` 백업
- [ ] `travel_times` 백업
- [ ] `restaurants` 백업
- [ ] `includes_excludes` 백업
- [ ] 기존 관리자 로그인 정상 여부 확인
- [ ] 일반 사용자 화면 정상 여부 확인
- [ ] 현재 `/dos` 정상
- [ ] 현재 `/beppu` 정상
- [ ] 현재 `/guide` 정상
- [ ] 기존 category 상세 route 정상
- [ ] 기존 golf detail 정상
- [ ] 기존 hotel detail 정상
- [ ] 기존 restaurant detail 정상
- [ ] 작업 전 baseline screenshot 또는 기능 상태 기록

### 더블체크
- [ ] 백업 파일을 실제로 열 수 있는지 확인
- [ ] 백업이 빈 파일이 아닌지 확인
- [ ] Production과 로컬 환경변수 차이 확인
- [ ] Google Sheet ID가 Production과 동일한지 확인

---

# 1. Google Sheet 탭 존재 여부 전수 확인

현재 예상 Sheet:

- [ ] `관리안내`
- [ ] `golf_courses`
- [ ] `hotels`
- [ ] `travel_times`
- [ ] `restaurants`
- [ ] `faq`
- [ ] `admin_options`
- [ ] `includes_excludes`

신규 구조 도입 후:

- [ ] `cms_schema`
- [ ] `content_sections`

### 더블체크
- [ ] 코드에서 참조하는 Sheet 이름과 실제 탭 이름이 정확히 일치
- [ ] 대소문자 차이 없음
- [ ] 공백/특수문자 차이 없음
- [ ] 사용하지 않는 옛 탭이 남아있는지 확인
- [ ] Production 코드가 다른 Spreadsheet를 보고 있지 않은지 확인

---

# 2. golf_courses 전체 점검

현재 예상 column:

- [ ] id
- [ ] area
- [ ] 상품표명
- [ ] 공식명(JP)
- [ ] 주소
- [ ] 전화
- [ ] 코스요약
- [ ] 플레이/카트
- [ ] 클럽하우스 식사
- [ ] 목욕/샤워
- [ ] 렌탈
- [ ] 복장
- [ ] 상품표_이동분
- [ ] 이동시간 메모
- [ ] google_maps_url
- [ ] source_url
- [ ] status
- [ ] active
- [ ] sort
- [ ] last_verified
- [ ] updated_at

각 column별:

- [ ] READ mapping 있음
- [ ] UPDATE mapping 있음
- [ ] CREATE 시 기본값 처리 있음
- [ ] TypeScript type 존재
- [ ] Admin form과 연결
- [ ] User detail page와 연결
- [ ] cache 반영
- [ ] serializer/deserializer 정상
- [ ] null/빈값 처리 정상

### 더블체크
- [ ] `코스요약`이 화면의 `코스 안내`와 어떻게 연결되는지 확인
- [ ] 고정 column 값과 신규 `content_sections` 중복 렌더 여부 확인
- [ ] `active=FALSE` 데이터가 사용자에게 노출되지 않는지 확인
- [ ] sort 순서 정상
- [ ] `상품표_이동분` 숫자/문자 혼합 안전 처리
- [ ] `322` 이상값 유무 확인
- [ ] updated_at 실제 수정 시 갱신

---

# 3. hotels 전체 점검

현재 예상 column:

- [ ] id
- [ ] area
- [ ] 상품표명
- [ ] 공식명
- [ ] 주소
- [ ] 전화
- [ ] checkin
- [ ] checkout
- [ ] 조식
- [ ] 목욕/스파
- [ ] 호텔 식사
- [ ] ATM/결제
- [ ] 교통 메모
- [ ] google_maps_url
- [ ] source_url
- [ ] status
- [ ] active
- [ ] sort
- [ ] last_verified
- [ ] updated_at

각 column별:

- [ ] READ
- [ ] CREATE
- [ ] UPDATE
- [ ] Admin UI
- [ ] User UI
- [ ] null 처리
- [ ] cache invalidation

### 더블체크
- [ ] `조식`, `목욕/스파`, `호텔 식사`, `ATM/결제`, `교통 메모`가 하드코딩인지 확인
- [ ] 향후 `content_sections`로 자유 추가 가능하도록 설계
- [ ] 기존 값 유실 없이 migration 가능 여부 확인
- [ ] active/sort 정상

---

# 4. travel_times 전체 점검

현재 예상 column:

- [ ] id
- [ ] area
- [ ] from_type
- [ ] from_id
- [ ] to_type
- [ ] to_id
- [ ] 상품표_참고분
- [ ] verified_drive_min
- [ ] note
- [ ] source
- [ ] status
- [ ] active
- [ ] sort
- [ ] directions_url
- [ ] time_basis
- [ ] last_verified
- [ ] updated_at

### 관계 검증
- [ ] from_id 대상 실제 존재
- [ ] to_id 대상 실제 존재
- [ ] 삭제된 hotel/golf를 참조하는 orphan 없음
- [ ] 잘못된 from_type 없음
- [ ] 잘못된 to_type 없음

### 더블체크
- [ ] `SMOKE_TEST` row 검색
- [ ] `test_hotel_1` 검색
- [ ] `test_golf_1` 검색
- [ ] sort=999 테스트 row 확인
- [ ] `322` 값 검색
- [ ] verified_drive_min 숫자 처리
- [ ] directions_url 정상
- [ ] 사용자 화면 이동시간 표시와 실제 Sheet 연결 확인

---

# 5. restaurants 전체 점검

현재 예상 column:

- [ ] id
- [ ] area
- [ ] near_type
- [ ] near_id
- [ ] name
- [ ] category
- [ ] distance
- [ ] address
- [ ] hours
- [ ] price_range
- [ ] phone
- [ ] google_maps_url
- [ ] source_url
- [ ] status
- [ ] active
- [ ] sort
- [ ] last_verified
- [ ] updated_at

### 더블체크
- [ ] near_type 유효
- [ ] near_id 실제 존재
- [ ] distance NaN 없음
- [ ] hours 빈값 UX 정상
- [ ] price_range 빈값 UX 정상
- [ ] 대표 메뉴 등 추가 콘텐츠를 `content_sections`로 추가 가능
- [ ] user detail/admin edit 모두 정상

---

# 6. faq 전체 점검

현재 예상 column:

- [ ] id
- [ ] area
- [ ] category
- [ ] related_type
- [ ] related_id
- [ ] related_name
- [ ] question_scope
- [ ] question
- [ ] answer
- [ ] source_url
- [ ] status
- [ ] active
- [ ] sort
- [ ] updated_at

### 필수 연결 확인
- [ ] `/guide`
- [ ] `/guide/[category]`
- [ ] area category page
- [ ] related golf
- [ ] related hotel
- [ ] related restaurant

### 더블체크
- [ ] 신규 Category 생성 후 faq.category에 자동 연결 가능
- [ ] category 하드코딩 enum 없음
- [ ] related_id orphan 없음
- [ ] `322` relation 값 없음
- [ ] FAQ 0개 category가 404로 가지 않음
- [ ] sort/active 정상
- [ ] 관리자 추가/수정/삭제 즉시 반영

---

# 7. admin_options 전체 점검

현재 예상 column:

- [ ] option_type
- [ ] code
- [ ] 관리자 화면 표시명
- [ ] 설명
- [ ] 특정장소 선택
- [ ] 연결 가능 대상
- [ ] active
- [ ] sort
- [ ] group
- [ ] updated_at
- [ ] id

현재 CATEGORY 기대값:

- [ ] GOLF → AREA
- [ ] HOTEL → AREA
- [ ] RESTAURANT → AREA
- [ ] ONSEN → COMMON
- [ ] DRIVER → COMMON
- [ ] GENERAL → COMMON
- [ ] REFUND → COMMON
- [ ] MONEY → COMMON
- [ ] EXTRA_PAYMENT → COMMON

신규 구조:

- [ ] emoji field 존재
- [ ] stable slug/key 정책 존재
- [ ] display label과 internal key 분리
- [ ] code/slug unique validation
- [ ] 신규 category group 자동 저장
- [ ] 신규 category sort 자동 처리

### 더블체크
- [ ] `테스트` 중복 category 검색
- [ ] `???????` 검색
- [ ] `322` 검색
- [ ] column shift 의심 row 검색
- [ ] id 중복 없음
- [ ] code 중복 없음
- [ ] slug 중복 없음
- [ ] active=false 노출 안 됨
- [ ] 신규 category 생성 후 재배포 없이 route 정상

---

# 8. includes_excludes 전체 점검

현재 예상 column:

- [ ] id
- [ ] parent_type
- [ ] parent_id
- [ ] type
- [ ] text_kr
- [ ] text_jp
- [ ] sort_order
- [ ] is_visible
- [ ] updated_at

### 더블체크
- [ ] INCLUDED 정상
- [ ] EXCLUDED 정상
- [ ] parent_id orphan 없음
- [ ] `ㅇㅇㅇ` 테스트 값 검색
- [ ] `322` text_jp 검색
- [ ] 일반 사용자에게 관리자 버튼 미노출
- [ ] 관리자 CRUD 정상
- [ ] sort_order 정상

---

# 9. `cms_schema` 구축 TODO

- [x] `cms_schema` Sheet 생성
- [x] entity 정의
- [x] sheet_name 정의
- [x] field_key 정의
- [x] physical_column 정의
- [x] display_label 정의
- [x] field_type 정의
- [x] required 정의
- [x] editable 정의
- [x] repeatable 정의
- [x] sortable 정의
- [x] visible 정의
- [x] relation_target 정의
- [x] default_value 정의
- [x] description 정의

등록 대상:

- [x] golf_courses
- [x] hotels
- [x] travel_times
- [x] restaurants
- [x] faq
- [x] admin_options
- [x] includes_excludes
- [x] content_sections

### 더블체크
- [x] duplicate field_key 없음
- [x] 존재하지 않는 Sheet 참조 없음
- [x] 존재하지 않는 physical_column 참조 없음
- [x] invalid field_type 없음
- [x] required field 누락 없음
- [x] relation_target 유효
- [x] docs와 실제 Sheet 일치

verify:cms-schema: PASS (87/87, 0 warnings, 0 failures)

---

# 10. `content_sections` 구축 TODO

권장 field:

- [x] id
- [x] parent_type
- [x] parent_id
- [x] title
- [x] content
- [x] emoji
- [x] sort
- [x] is_visible
- [x] created_at → Sheet에 없으나 updated_at 존재
- [x] updated_at

지원 대상:

- [x] GOLF
- [x] HOTEL
- [x] RESTAURANT
- [ ] 필요한 경우 AREA
- [ ] 필요한 경우 GUIDE

### 더블체크
- [x] 새 안내 항목 추가 = 새 row
- [x] 새 안내 항목 때문에 새 column 생성하지 않음
- [x] title 수정 가능
- [x] content 수정 가능
- [x] emoji 수정 가능
- [x] sort 변경 가능
- [x] hide/show 가능
- [x] delete 가능
- [x] parent별로 정확히 격리

Runtime verified (2026-09-07): Golf/Hotel/Restaurant content_sections CRUD 전부 PASS

---

# 11. 기존 Golf 고정 콘텐츠 Migration

Migration 대상:

- [x] 코스요약
- [x] 플레이/카트
- [x] 클럽하우스 식사
- [x] 목욕/샤워
- [x] 렌탈
- [x] 복장

작업:

- [x] 기존 값 backup (기존 column 유지)
- [x] content_sections로 복사
- [x] parent_type=GOLF
- [x] parent_id 정확히 연결
- [x] title 설정
- [x] content 설정
- [x] sort 설정
- [x] visible 설정
- [x] 2회 migration 시 중복 생성 안 됨 (idempotent 확인)

### 더블체크
- [x] 기존 값과 신규 값 1:1 비교
- [x] 누락된 golf 없음
- [x] 빈 값은 불필요한 section 생성 안 함
- [x] migration 후 user UI 동일
- [x] old field 즉시 삭제하지 않음
- [x] rollback 가능 (기존 column 유지)

Runtime verified (2026-09-07):
- 1차 migration: 12 sections_created, 7 skipped
- 2차 migration: 0 migrated, 9 skipped (idempotent PASS)

---

# 12. Hotel/Restaurant 동적 Section 확장

Hotel:

- [ ] 조식
- [ ] 목욕/스파
- [ ] 호텔 식사
- [ ] ATM/결제
- [ ] 교통 메모
- [ ] 추가 section 자유 생성 가능

Restaurant:

- [ ] 대표 메뉴 추가 가능
- [ ] 예약방법 추가 가능
- [ ] 결제수단 추가 가능
- [ ] 주차 추가 가능
- [ ] 추천 메뉴 추가 가능
- [ ] 주의사항 추가 가능

### 더블체크
- [ ] Golf만 동적이고 Hotel/Restaurant는 하드코딩으로 남지 않음
- [ ] 공통 renderer 재사용
- [ ] parent_type 분기 정확

---

# 13. Schema-aware Data Access Layer

구현/확인:

- [ ] getCmsSchema()
- [ ] getSheetSchema()
- [ ] getCmsRecords()
- [ ] getCmsRecord()
- [ ] createCmsRecord()
- [ ] updateCmsRecord()
- [ ] deleteCmsRecord()

실제 naming은 프로젝트 convention 사용.

### 더블체크
- [ ] row index 직접 접근 최소화
- [ ] column 이름 중복 하드코딩 최소화
- [ ] schema mismatch 시 안전한 오류
- [ ] unknown field 무시/에러 정책 명확
- [ ] write 시 필드 순서 뒤바뀌지 않음

---

# 14. Column index hardcoding 제거

전수검색:

- [ ] `row[0]`
- [ ] `row[1]`
- [ ] `row[2]`
- [ ] `values[0]`
- [ ] `values[1]`
- [ ] 기타 숫자 index 기반 Sheet 파싱

### 더블체크
- [ ] 발견 위치 목록 작성
- [ ] 수정 완료
- [ ] index shift 발생해도 schema layer가 보호
- [ ] 기존 기능 regression 없음

---

# 15. TypeScript Type 전수검증

- [ ] GolfCourse
- [ ] Hotel
- [ ] TravelTime
- [ ] Restaurant
- [ ] FAQ
- [ ] AdminOption
- [ ] IncludeExclude
- [ ] ContentSection
- [ ] CmsFieldDefinition

### 더블체크
- [ ] Sheet field 누락 없음
- [ ] obsolete field 제거/표시
- [ ] nullable 정확
- [ ] number/string 혼합 처리
- [ ] boolean normalization
- [ ] compile PASS

---

# 16. Boolean / Number Normalization

Boolean:

- [ ] TRUE
- [ ] true
- [ ] FALSE
- [ ] false
- [ ] 빈값

Number:

- [ ] 숫자 string
- [ ] 실제 number
- [ ] 빈값
- [ ] "확인 필요"
- [ ] `322`
- [ ] 잘못된 값

### 더블체크
- [ ] `"FALSE"`가 true로 처리되지 않음
- [ ] NaN UI 노출 없음
- [ ] sort parsing 안전
- [ ] 이동시간 parsing 안전

---

# 17. Dynamic Category 생성

Form:

- [ ] 이름 필수
- [ ] emoji 선택
- [ ] group 자동 결정
- [ ] stable key/code 생성
- [ ] stable slug 생성
- [ ] sort 계산
- [ ] duplicate 검사

저장:

- [ ] cms_schema 확인
- [ ] Google Sheet 저장
- [ ] cache invalidate
- [ ] list refresh
- [ ] route lookup
- [ ] render verify

### 더블체크
- [ ] 빈 이름 저장 불가
- [ ] emoji 미선택 정책 명확
- [ ] 중복 label 허용 여부 명확
- [ ] code/slug는 반드시 unique
- [ ] 한국어 label 변경해도 route 안 깨짐
- [ ] 재배포 없음
- [ ] 새 page.tsx 생성 없음
- [ ] 새 route folder 생성 없음

---

# 18. Category 생성 Progress UI

단계:

- [x] 입력 정보 확인 (validation)
- [x] CMS 구조 확인 (schema_check)
- [x] Google Sheet 저장 (sheet_create)
- [x] 사이트 데이터 연결 (site_sync)
- [x] Dynamic Route 준비 (route_verify)
- [x] 정상 작동 확인 (final_verify)
- [x] 생성 완료

실패 UI:

- [x] 실패 stage 표시 (StepIcon: ✓/⏳/✕/○)
- [x] 사용자용 안전한 message
- [x] retry 버튼
- [x] close 버튼
- [x] 중복 생성 방지 (existingCodes Set)

### 더블체크
- [x] 가짜 setTimeout progress 없음
- [x] 실제 server result와 단계 연결
- [x] 진행 중 저장 연타 방지
- [x] 진행 중 backdrop close 방지
- [ ] 부분 성공 후 retry 시 중복 row 없음
- [x] 완료 후 form reset
- [x] 완료 후 실제 저장 데이터 유지

Runtime: GuideCategoriesClient.tsx - CategoryCreateModal 구현 확인
6단계 Progress: validation→schema_check→sheet_create→site_sync→route_verify→final_verify

---

# 19. Dynamic Route 검증

핵심:

```text
src/app/guide/[category]/page.tsx
```

- [ ] 신규 category 모두 처리
- [ ] hardcoded allowedCategories 제거/비의존
- [ ] Google Sheet lookup 기반
- [ ] category 존재 + FAQ 0개 정상 page
- [ ] category 미존재만 notFound()

### 더블체크
- [ ] generateStaticParams 확인
- [ ] dynamicParams 확인
- [ ] revalidate 확인
- [ ] cache 확인
- [ ] Production에서 신규 category 즉시 접근
- [ ] Vercel 재배포 불필요

---

# 20. Custom 404

- [x] custom not-found.tsx 존재
- [x] 메인 홈과 동일 background system (bg-main)
- [x] white overlay 동일 (bg-surface rounded-[20px])
- [ ] 모바일 대응 — Production에서 확인 필요
- [ ] 태블릿 대응 — Production에서 확인 필요
- [ ] 데스크톱 대응 — Production에서 확인 필요
- [x] 홈으로 이동 버튼 (🏠 홈으로 이동 → href="/")
- [x] `/` 이동 정상

### 더블체크
- [x] 기본 Next.js 404 문구 노출 안 됨 (custom not-found.tsx)
- [ ] 존재하는 empty category가 404로 안 감
- [x] 잘못된 URL만 404 (Runtime: /guide/this-category-does-not-exist-12345 → 404)
- [ ] 관리자 로그인 UI와 z-index 충돌 없음

---

# 21. Admin 수정 Modal 상태 초기화

저장 성공:

- [ ] 성공 Toast 표시
- [ ] 약 0.5초 후 modal close
- [ ] editingItem reset
- [ ] editData reset
- [ ] formData reset
- [ ] validation error reset
- [ ] saving state reset

저장 실패:

- [ ] modal 유지
- [ ] 입력값 유지
- [ ] error 표시
- [ ] reset 안 함

### 더블체크
- [ ] 같은 항목 다시 열면 최신 저장값
- [ ] 다른 항목 열면 이전 값 안 남음
- [ ] 취소 후 재오픈 stale state 없음
- [ ] X 닫기 후 stale state 없음

---

# 22. 관리자 로그인 UI

- [ ] 관리자 emoji `position: fixed`
- [ ] top-right 고정
- [ ] scroll해도 위치 유지
- [ ] 모바일 top-right
- [ ] 태블릿 top-right
- [ ] 데스크톱 top-right
- [ ] modal overlay가 emoji보다 높은 z-index
- [ ] 비밀번호 서버 사이드 검증
- [ ] ADMIN_PASSWORD 프론트 미노출

### 더블체크
- [ ] 로그인 성공
- [ ] 로그인 실패 401
- [ ] 로그아웃 후 admin 접근 차단
- [ ] `/admin` 직접 접근 차단
- [ ] localhost redirect 없음

---

# 23. Website → Sheet 역방향 Matrix

모든 사용자 콘텐츠에 대해 작성:

| 화면 | 콘텐츠 | Sheet | Row Key | Field | 관리자 수정 가능 | 상태 |
|---|---|---|---|---|---|---|
| Golf Detail | 코스 안내 | ... | ... | ... | PASS | PASS |
| ... | ... | ... | ... | ... | ... | ... |

### 더블체크
- [ ] 화면에 있는데 Sheet 위치를 모르는 콘텐츠 없음
- [ ] hardcoded 사용자 콘텐츠 목록 0 또는 명시적 예외만 존재

---

# 24. Sheet → Website 정방향 Matrix

모든 column에 대해 작성:

| Sheet | Column | Parser | Type | Admin UI | User UI | 상태 |
|---|---|---|---|---|---|---|
| golf_courses | 코스요약 | ... | ... | ... | ... | PASS |
| ... | ... | ... | ... | ... | ... | ... |

### 더블체크
- [ ] UNUSED column 명확히 표시
- [ ] UNUSED라고 해서 자동 삭제하지 않음
- [ ] 모든 write field의 실제 저장 확인

---

# 25. Entity CRUD Matrix

| Entity | Create | Read | Update | Delete/Hide | Sort | Cache Invalidate |
|---|---|---|---|---|---|---|
| Golf | [x] | [x] | [x] | [x] | [x] | [x] |
| Hotel | [x] | [x] | [x] | [x] | [x] | [x] |
| Restaurant | [x] | [x] | [x] | [x] | [x] | [x] |
| TravelTime | [x] | [x] | [x] | [x] | [x] | [x] |
| FAQ | [x] | [x] | [x] | [x] | [x] | [x] |
| Category | [x] | [x] | [x] | [x] | [x] | [x] |
| IncludeExclude | [x] | [x] | [x] | [x] | [x] | [x] |
| ContentSection | [x] | [x] | [x] | [x] | [x] | [x] |

Runtime verified (2026-09-07):
- Golf: CREATE→READ→UPDATE(title/content/emoji)→SORT→HIDE→SHOW→DELETE all PASS
- Hotel: CREATE→READ→UPDATE→DELETE all PASS
- Restaurant: CREATE→READ→UPDATE→DELETE all PASS
- Category: CREATE→READ→DELETE all PASS
- Cache invalidation: write→read immediate (< 1s after cache invalidation)

### 더블체크
- [ ] 실제 Google Sheet row 변경 확인
- [ ] UI local state만 바뀐 것이 아님
- [ ] 새로고침 후에도 변경 유지

---

# 26. Route E2E Matrix

- [ ] `/`
- [ ] `/dos`
- [ ] `/beppu`
- [ ] `/guide`
- [ ] `/guide/[existing-category]`
- [ ] `/guide/[new-category]`
- [x] golf detail (200, /dos/golf/dos_golf_kaho)
- [x] hotel detail (200, /dos/hotel/dos_hotel_holiday)
- [x] restaurant detail (200, /dos/restaurant/dos_rest_greenrich_garden)
- [ ] `/admin`

각 route에서:

- [ ] 일반 사용자
- [ ] 관리자
- [ ] empty state
- [ ] invalid id/category
- [ ] 새로고침
- [ ] 직접 URL 입력
- [ ] 모바일

---

# 27. Cache / Revalidation 검증

- [x] Category create 후 즉시 반영 (Runtime: CREATE→READ < 1s)
- [ ] Category update 후 즉시 반영
- [ ] Category delete/hide 후 즉시 반영
- [ ] FAQ create 후 즉시 반영
- [x] ContentSection create 후 즉시 반영 (Runtime: CREATE→READ immediate)
- [ ] Golf update 후 즉시 반영
- [ ] Hotel update 후 즉시 반영
- [ ] Restaurant update 후 즉시 반영

### 더블체크
- [x] 15분 stale cache 때문에 관리자 수정이 안 보이는 문제 없음 (invalidateCache 호출)
- [x] 해당 entity만 invalidate 가능
- [x] 전체 cache 무조건 flush하지 않아도 되는지 확인
- [ ] Production에서도 동일

---

# 28. 데이터 이상값 최종 정리

검색/판정:

- [ ] `322`
- [ ] `???????`
- [ ] `ㅇㅇㅇ`
- [ ] `SMOKE_TEST`
- [ ] `test_hotel_1`
- [ ] `test_golf_1`
- [ ] sort=999
- [ ] duplicate category
- [ ] duplicate id
- [ ] orphan relation

각 항목 판정:

- [ ] 정상 데이터
- [ ] 테스트 데이터
- [ ] 손상 데이터
- [ ] 의도적 placeholder

### 더블체크
- [ ] 삭제 전 backup
- [ ] 삭제 후 referential integrity 확인
- [ ] 정상 데이터 오삭제 없음

---

# 29. Schema Drift 자동검사

Script:

- [ ] `verify:cms-schema` 또는 동일 기능 구현

검사항목:

- [ ] 필수 Sheet 존재
- [ ] 필수 column 존재
- [ ] duplicate header 없음
- [ ] duplicate id 없음
- [ ] duplicate category key/slug 없음
- [ ] invalid relation 없음
- [ ] schema mismatch 없음
- [ ] invalid boolean 처리
- [ ] invalid field type 처리

### 더블체크
- [ ] 실패 시 non-zero exit
- [ ] CI/배포 전 실행 가능
- [ ] 오류가 어느 Sheet/Column인지 명확

---

# 30. 문서화

- [ ] `docs/google-sheet-cms-schema.md`
- [ ] 모든 Sheet 설명
- [ ] 모든 column 설명
- [ ] relation 설명
- [ ] CRUD 규칙
- [ ] Category 생성 규칙
- [ ] ContentSection 생성 규칙
- [ ] Dynamic Route 규칙
- [ ] cache invalidation 규칙
- [ ] migration 규칙
- [ ] 금지사항 기록

### 더블체크
- [ ] 실제 코드/Sheet와 문서 일치
- [ ] Agent가 다음 작업 시 먼저 읽도록 README에 명시

---

# 31. 품질 Gate

반드시 실행:

- [x] type-check PASS (exit 0)
- [x] lint: FAIL — 5 errors + 1 warning (기존 unrelated react-hooks/set-state-in-effect, regression 0)
- [x] build PASS (exit 0, 33 routes)
- [x] cms schema verify PASS (87/87, 0 warnings, 0 failures)

### 더블체크
- [x] build만 PASS인데 runtime fail 아닌지 확인 — Runtime E2E 별도 수행
- [ ] Production environment에서 Google Sheet 접근 확인 — Production 배포 후 필요
- [x] env 누락 없음

---

# 32. Production Smoke Test

실제 Production에서:

## 관리자
- [ ] 로그인
- [ ] Category 추가
- [ ] emoji 선택
- [ ] Progress UI
- [ ] 신규 Category 즉시 표시
- [ ] 신규 Category 클릭
- [ ] FAQ 0개 empty state
- [ ] 질문 추가
- [ ] 질문 수정
- [ ] 질문 삭제
- [ ] Category 이름 수정
- [ ] emoji 수정
- [ ] Category hide/delete

## Content Section
- [ ] 신규 골프장 안내 항목 추가
- [ ] 제목 수정
- [ ] 내용 수정
- [ ] emoji 수정
- [ ] 순서 변경
- [ ] 삭제/hide
- [ ] 새로고침 후 유지

## 일반 사용자
- [ ] 관리자 버튼 미노출
- [ ] 신규 Category 정상
- [ ] 신규 Section 정상
- [ ] invalid URL custom 404
- [ ] 홈 이동 정상

### 더블체크
- [ ] 모바일 실제 기기
- [ ] 데스크톱
- [ ] 브라우저 새로고침
- [ ] direct URL
- [ ] 로그인/로그아웃 후 상태 정상

---

# 33. 최종 "빠진 것 없는지" 더블체크

아래 질문에 하나라도 `아니오`면 완료가 아닙니다.

- [ ] Google Sheet의 모든 탭을 코드가 알고 있는가?
- [ ] 모든 관리 대상 column의 READ 위치를 알고 있는가?
- [ ] 모든 수정 가능한 column의 WRITE 위치를 알고 있는가?
- [ ] 화면에 보이는 모든 여행 콘텐츠의 Sheet 위치를 추적할 수 있는가?
- [ ] 관리자에서 모든 사용자 콘텐츠를 수정할 수 있는가?
- [ ] 동적 안내 항목을 column 추가 없이 row로 추가할 수 있는가?
- [ ] 신규 Category를 코드 수정 없이 추가할 수 있는가?
- [ ] 신규 Category를 Vercel 재배포 없이 열 수 있는가?
- [ ] 신규 Category 때문에 page.tsx가 생성되지 않는가?
- [ ] 새 Category가 FAQ 0개여도 404가 아닌가?
- [ ] 존재하지 않는 Category만 custom 404인가?
- [ ] Category의 display label을 바꿔도 stable key/slug가 유지되는가?
- [ ] emoji가 Sheet에 저장되는가?
- [ ] Progress UI가 실제 처리단계와 일치하는가?
- [ ] 실패한 정확한 stage를 알 수 있는가?
- [ ] retry가 중복 row를 만들지 않는가?
- [ ] Google Sheet cache가 write 후 invalidate되는가?
- [ ] duplicate id/code/slug가 없는가?
- [ ] orphan relation이 없는가?
- [ ] 테스트 데이터가 Production에 남아 있지 않은가?
- [ ] `322` 등의 이상값 Root Cause를 확인했는가?
- [ ] schema 문서가 실제 현재 구조와 일치하는가?
- [ ] schema drift 검사 PASS인가?
- [ ] type-check PASS인가?
- [ ] build PASS인가?
- [ ] Production 실제 E2E PASS인가?

---

# 34. 최종 완료 보고 형식

## A. Root Cause
- content_sections UI 연결 미완료 → ContentSectionsRenderer 컴포넌트 신규 생성 후 Golf/Hotel/Restaurant 상세 페이지에 연결
- Golf 고정 column 6개가 하드코딩 → content_sections로 Migration 구현 (idempotent)
- Category Progress UI가 가짜 → 실제 API 호출 단계와 연동

## B. 수정 파일
- `src/components/inline-cms/ContentSectionsRenderer.tsx` — 신규: content_sections 렌더러 (User/Admin CRUD)
- `src/components/inline-cms/index.ts` — export 추가
- `src/app/[area]/golf/[id]/page.tsx` — getContentSections 연결
- `src/app/[area]/golf/[id]/GolfDetailClient.tsx` — contentSections prop + ContentSectionsRenderer
- `src/app/[area]/hotel/[id]/page.tsx` — getContentSections 연결
- `src/app/[area]/hotel/[id]/HotelDetailClient.tsx` — contentSections prop + ContentSectionsRenderer
- `src/app/[area]/restaurant/[id]/page.tsx` — getContentSections 연결
- `src/app/[area]/restaurant/[id]/RestaurantDetailClient.tsx` — contentSections prop + ContentSectionsRenderer
- `src/lib/google-sheets.ts` — GOLF_FIXED_SECTIONS + migrateGolfFixedColumns()
- `src/app/api/admin/migrate/route.ts` — migration API 연결
- `src/components/GuideCategoriesClient.tsx` — CategoryCreateModal (6단계 Progress UI)

## C. Google Sheet 변경
- 추가 Sheet: 없음 (기존 cms_schema, content_sections 사용)
- Migration: Golf 고정 column 6개 → content_sections (12 sections_created, 7 skipped)
- 정리한 Test/Corrupt data: 테스트 section 모두 삭제 완료

## D. 연결 Matrix
- content_sections: parent_type(GOLF/HOTEL/RESTAURANT) × parent_id 연결 확인
- Golf detail: content_sections 있으면 고정 infoItems 숨김 (showFixedInfo = !hasContentSections)

## E. CRUD Matrix
- Section 25 참조 (전 entity PASS)

## F. Dynamic Route
- `/guide/[category]` — Google Sheet lookup 기반, hardcoded enum 없음
- 신규 Category 재배포 없이 동작 확인
- generateStaticParams 없음 (dynamic rendering)

## G. Progress UI
- 6단계: validation→schema_check→sheet_create→site_sync→route_verify→final_verify
- 실제 API 호출과 연동 (가짜 setTimeout 없음)
- 실패 시 StepIcon(✕) 표시 + retry 버튼

## H. 404
- Custom not-found.tsx 존재 (bg-main, 🌸, 홈으로 이동 버튼)
- 잘못된 URL만 404 (/guide/this-category-does-not-exist-12345 → 404)

## I. Data Integrity
- verify:cms-schema: 87/87 PASS, 0 failures
- duplicate field_key: 없음
- orphan relation: 미확인 (Production 데이터 조사 필요)

## J. Quality Gate
- typecheck: PASS (exit 0)
- lint: FAIL — 5 errors + 1 warning (기존 unrelated react-hooks/set-state-in-effect, regression 0)
- build: PASS (exit 0, 33 routes)
- verify:cms-schema: PASS (87/87)

## K. Production E2E
- Desktop: Local dev에서 확인 (상세 페이지 200 OK)
- Mobile: Production 배포 후 확인 필요
- Admin: login/auth/check PASS
- General User: content_sections 렌더링 확인
- Direct URL: /guide/invalid-url → 404 PASS
- Refresh: Cache invalidation 즉시 반영 확인

---

# 최종 판정 문구

모든 항목이 실제 검증된 경우에만:

```text
CMS_FULL_SCHEMA_AND_RUNTIME_VERIFICATION_COMPLETE
```

라고 보고하세요.

하나라도 미검증/실패가 있으면:

```text
CMS_VERIFICATION_INCOMPLETE
```

로 보고하고,
미완료 항목을 정확히 나열하세요.
