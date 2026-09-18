# 일본 여행 가이드 — 코드 감사 및 에이전트 수정 지시서

작성일: 2026-09-18
대상: https://github.com/Sup-AI-Main/japan-chat-web
검토 커밋: `3262dd56bd70ea8f30ce399e79d2bb89146faf3a` (`main`)
공개 사이트: https://japan-chat-web.vercel.app

## 1. 결론과 검토 범위

문제는 단순히 파일이 크다는 데 있지 않다. **화면 → API → 저장 함수 → DB → 공개 조회 → 캐시** 사이의 계약이 여러 곳에서 다르다. 따라서 한 화면에서 성공 알림을 봤거나 TypeScript 빌드가 통과했다는 이유만으로 기능 완료를 선언하면 안 된다.

확인한 주요 경로: 관리자 인증, 지역/카테고리 조회, 호텔/골프장/맛집 생성·수정, 이동시간, FAQ, 포함·불포함, 콘텐츠 섹션, 동적 라벨, 공개 페이지 ISR, DB 마이그레이션과 검증 명령.

증거 등급:

- **코드 확정**: 검토 커밋의 호출자와 구현을 대조해 결함을 확인했다. 운영 DB에서 실제 발생한 피해를 의미하지 않는다.
- **로컬 재현**: 실제 헬퍼를 가짜 HTTP 응답으로 실행하거나 저장소 명령을 실행했다. 운영 DB에 쓰지 않았다.
- **운영 읽기 확인**: 공개 URL의 HTTP/HTML만 확인했다. 관리자 쿠키 위조, 실제 수정·삭제, 부하 테스트는 실행하지 않았다.
- **운영 확인 필요**: 실제 스키마, 트리거, 함수 권한, 배포 커밋 등에 따라 최종 영향이 달라진다.

GitHub의 해당 커밋에는 Vercel `success` 상태가 있다. 이것만으로 현재 운영 도메인이 정확히 같은 커밋인지, 모든 기능이 정상인지 증명되지는 않는다. 운영 DB 접속 정보가 없어 DB 권한·데이터·트리거는 조회하지 않았다. 의존성 설치, 전체 빌드, 로그인 후 브라우저 CRUD는 이번 감사에서 실행하지 않았다.

## 2. 반드시 유지할 제품 요구사항

1. 현재 화면 구조, 메뉴 배치, 카드·모달 디자인, 모바일/태블릿/PC 레이아웃을 유지한다.
2. 일반 사용자 회원가입·로그인·회원 테이블이 없는 정보 안내 홈페이지다. 관리자는 1명이며 기존 ENV `ADMIN_PASSWORD` 하나를 입력하는 모달만 유지한다. Supabase Auth, OAuth, 역할/권한 관리, 관리자 계정 테이블, 세션 DB, Redis를 새로 도입하지 않는다.
3. FAQ, 공통 안내, 차량 이동시간, 호텔, 골프장, 맛집, 관광지, 포함·불포함, 하위 콘텐츠 섹션을 삭제하거나 축소하지 않는다.
4. **이동시간은 관리자 수정 가능 기능이다. 읽기 전용으로 바꾸지 않는다.**
5. 도스 요청에서는 도스에 필요한 콘텐츠와 실제 사용하는 공통 정보만 읽는다. 다른 지역의 상세 콘텐츠를 함께 읽지 않는다. 작은 지역/메뉴 메타데이터 조회와 다른 지역 콘텐츠 전체 조회를 구별한다.
6. 인라인 편집과 관리자 페이지는 모두 유지하되 저장 규칙을 공유한다.
7. 관리자가 누르는 삭제는 DB 행의 실제 DELETE다. 숨김은 별도 기능이며 active=false로만 처리한다. 임의 운영 데이터 일괄 정리·초기화, RLS 해제, 프레임워크 업그레이드, `cacheComponents` 도입, 전면 재작성은 범위 밖이다.
8. 관리자 기능은 기존 콘텐츠 추가·수정·삭제·정렬·노출 관리에 한정한다. 일반 조회 경로에 관리자 인증 DB 요청을 추가하지 않는다. 이번 정정은 문서의 이전 보안 확장 제안보다 우선한다.

## 3. 우선순위 표

| ID | 우선순위 | 발견사항 | 근거 수준 |
|---|---|---|---|
| A01 | P0 | 고정 쿠키 값만으로 관리자 인증 | 코드 확정 |
| A02 | P0 확인 | 삭제용 SECURITY DEFINER 함수의 실행권한 제한 누락 | 마이그레이션 확정, 운영 권한 미확인 |
| A03 | P1 | 이동시간 입력 필드와 저장 필드 불일치 | 코드 확정 |
| A04 | P1 | 이동시간 생성 응답의 ID 추출 오류, 실패 성공처리 | 로컬 재현 + 코드 확정 |
| A05 | P1 | 관리자 Entity 생성 시 호텔/골프 전용 행 미생성 | 코드 확정, DB 트리거 확인 필요 |
| A06 | P1 | 맛집 기본 편집이 여러 주변 관계를 삭제·단일화 | 코드 확정 |
| A07 | P1 | CRUD 이후 공개 캐시 무효화 누락·오류 | 코드 확정 |
| A08 | P1 | 동적 카테고리 링크와 실제 공개 라우트 불일치 | 코드 확정, 운영 404 재현 |
| A09 | P1 | 비활성 지역·상세 항목 공개 조회 차단 누락 | 코드 확정, 운영 데이터 미확인 |
| A10 | P1 | 이동시간 지역 필터가 최상위 행을 제한하지 않을 위험 | 쿼리 구조 확인, 데이터 재현 필요 |
| A11 | P1 | 낙관적 동시성 검사가 실제 UPDATE 조건과 분리 | 코드 확정 |
| A12 | P1 | DB 오류를 빈 데이터 또는 정상 응답으로 숨김 | 코드 확정 |
| A13 | P2 | 검증 스크립트 누락 및 문서·구현 불일치 | 명령 실패 재현 |
| A14 | P2 | 지역 사전 생성 조건 오류 | 코드 확정 |
| A15 | P2 | 운영 진단 API가 인증 없이 반복 DB 조회 | 코드 확정 |
| A16 | P1 예방 | RLS 마이그레이션이 public 전체 정책을 삭제 | 코드 확정, 재실행 피해 미확인 |
| A17 | P1 | 카테고리 추가 중 중복 오류를 다른 관리자 수정으로 오표시 | 실제 헬퍼로 로컬 재현, 사용자 QA 사례 |
| A18 | P1 | 삭제 버튼을 DB 실제 삭제로 통일 | 사용자 확정 요구사항, 기존 soft delete 수정 대상 |

P0부터 해결한다. P1 기능 수정과 대규모 파일 분리는 같은 커밋에 섞지 않는다.

## 4. 상세 수정 지시

### A01. 관리자 인증 — 고정 쿠키 신뢰 제거

근거: `src/lib/auth.ts:3–8`, `setAuthCookie()`, `src/app/api/admin/login/route.ts`. 관리자 API들이 같은 `isAuthenticated()`를 호출하며, 저장은 `getSupabaseAdmin()`의 서버 비밀키를 사용한다.

현재 코드는 쿠키가 고정 문자열과 같은지만 확인한다. 서버가 발급한 세션이라는 증명, 만료 검증, 서명 검증이 없다. HttpOnly/Secure 속성은 서버가 받은 임의 쿠키의 진위를 증명하지 않는다. 이는 코드 수준의 인증 우회 결함이다. 실제 공격·유출 여부는 확인하지 않았다.

수정 — 계정 시스템 없이 최소 인증만 유지:

1. 기존 ADMIN_PASSWORD 비교와 비밀번호 모달을 유지한다. 사용자명·이메일·회원가입·Supabase Auth를 추가하지 않는다.
2. 비밀번호 확인 후 만료 시각과 난수값이 들어 있는 payload를 서버에서 HMAC 서명한 HttpOnly 쿠키로 발급한다. 기존 ADMIN_PASSWORD에서 용도를 구분해 서명키를 도출할 수 있으며, 비밀번호나 파생키 자체를 쿠키에 넣지 않는다. 별도 필수 ENV나 DB 테이블을 추가하지 않는다. ADMIN_PASSWORD는 추측하기 어려운 충분히 긴 값이어야 한다.
3. 서버 기본 crypto 기능으로 서명 및 만료를 검증한다. 일정 시간 비교를 사용하고 누락·변조·만료는 거부한다. 새 인증 패키지·세션 저장소·인증용 DB 왕복은 필요 없다.
4. 관리자 API와 관리자 전용 서버 페이지에만 검사한다. 공개 정보 페이지는 기존 정적/ISR 조회를 유지한다. 프런트 isAdmin은 버튼 표시 전용이다.
5. 쿠키는 production Secure, HttpOnly, SameSite 및 명시적 만료를 설정한다. 로그아웃은 해당 브라우저 쿠키 삭제, 비밀번호 변경은 새 서명키로 기존 쿠키 검증 실패가 되도록 한다. 무상태 방식은 로그아웃 전에 복사된 토큰을 개별 회수하지 못하므로 만료까지 유효할 수 있다. 이를 즉시 전역 로그아웃이라고 보고하지 않는다.
6. 쓰기 요청에는 간단한 동일 출처 검증을 적용한다. 전용 인증 서비스, MFA, 세션 관리 UI, 별도 rate-limit 인프라를 이번 작업에 추가하지 않는다.
7. 고정 authenticated 문자열 검사는 제거한다. 기존 서버 DB 비밀키 보호와 삭제 RPC 실행권한 제한(A02)은 유지한다. 이는 계정 기능 확장이 아니라 익명 수정·삭제를 막는 최소 경계다.

완료 기준: 쿠키 없음/기존 고정 쿠키/임의 값/변조/만료는 401, 정상 로그인만 CRUD 가능. 검증은 로컬 또는 격리된 테스트 환경에서 수행한다. 운영 사이트를 대상으로 우회 실험하지 않는다.

### A02. 삭제 RPC 권한 — RLS만 믿지 말 것

근거: `supabase/migrations/20260911071552_phase3c_atomic_delete.sql`. `delete_area_cascade`, `delete_category_cascade`, `delete_entity_cascade`, `delete_field_definition_cascade`가 `SECURITY DEFINER`이고 파일에 REVOKE/GRANT 또는 고정 search_path가 없다.

PostgreSQL 함수는 기본 실행권한과 소유자 권한을 함께 점검해야 한다. 현재 운영에서 익명 호출 가능한지는 `proacl`, 기본 권한 및 API 노출 설정을 확인해야 한다. 권한 제한이 별도로 적용되었을 가능성을 배제하지 않는다.

수정 절차:

1. `DIRECT_URL`을 사용한 읽기 전용 카탈로그 조회로 네 함수의 실제 시그니처·소유자·`prosecdef`·`proconfig`·ACL을 확인한다. 삭제 RPC를 호출해서 테스트하지 않는다.
2. `has_function_privilege`로 anon/authenticated/service_role의 EXECUTE 여부를 확인한다.
3. 새 마이그레이션에서 정확한 함수 시그니처에 대해 PUBLIC 및 불필요 역할의 실행권한을 회수하고 필요한 서버 역할만 허용한다. 트랜잭션으로 적용하도록 준비한다.
4. 함수 안의 객체 이름을 스키마로 한정하고 안전한 search_path를 고정한다.
5. 격리 DB에서 anon 실행 거부와 서버 역할의 정상 트랜잭션/롤백을 검증한다.

참고: [PostgreSQL CREATE FUNCTION — SECURITY DEFINER 안전 구성](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

### A03. 이동시간 저장 계약 복구

근거:

- `src/components/AreaTravelTimesClient.tsx:10–18, 71–75, 243–260`: `verified_drive_min`, `from_id`, `to_id` 전송 및 입력값을 화면 상태에 복사.
- `src/app/api/admin/travel-times/route.ts:32–47`: 같은 옛 필드 전달.
- `src/lib/supabase-cms.ts:1809–1873`: 실제 저장은 `product_reference_minutes`, `display_time`, `min_minutes`, `max_minutes`; PUT은 출발/도착 변경도 처리하지 않는다.
- `getTravelTimes()`는 조회한 `display_time`, 최소/최대, `updated_at`을 공개 DTO에서 버린다.

결과: 입력한 시간이 저장되지 않아도 현재 화면에는 입력값이 표시될 수 있다. 출발/도착 선택 변경도 영속화되지 않는다.

수정:

1. 시간 입력의 기존 의미를 유지하면서 요청 DTO를 하나로 정한다. 숫자 분과 `30~40분` 같은 표시 문자열을 구분한다. 문자열 범위를 무조건 `parseInt`해서 30으로 잘라 저장하지 않는다.
2. 기존 `verified_drive_min` 호출자를 남겨야 한다면 API 경계에서 명시적으로 호환 매핑한다. UI·API·저장 함수·읽기 mapper를 함께 수정한다.
3. 출발/도착은 검증된 UUID로 저장한다. slug 입력 호환은 경계에서 해석하고, 서로 다른 지역이나 잘못된 엔티티 타입 연결을 검증한다.
4. 시간 표시값 및 숫자 필드의 우선순위를 정의한다. 예: 명시된 display_time → 범위 → 기준 분. 0과 빈 값은 구별한다.
5. 생성/수정은 DB가 반환한 최신 행을 사용해 응답한다. 화면은 요청값을 저장 결과로 꾸미지 않는다.
6. DTO에 `updated_at`을 포함하고 A11의 조건부 갱신을 적용한다.

검증: 생성 35분, 수정 45분, 표시 범위 30~40분, 출발/도착 변경, 빈 값, 0, 음수, 비숫자 입력을 검증한다. 새로고침·별도 비로그인 세션에서 같은 값인지 확인한다. 관리자 이동시간 편집 기능을 유지한다.

### A04. 응답 envelope와 성공 판정 일치

근거: `src/lib/crud/response.ts`는 `{success:true,data:...}`를 반환하고, `src/lib/admin-fetch.ts:53`은 envelope 전체를 반환한다. 이동시간 화면은 `result.id`를 읽어 실제 `result.data.id`를 놓친다.

로컬에서 실제 adminFetchJson에 생성 응답을 공급한 결과: `actualTopLevelId=null`, `nestedId=fixture-id`. `{success:true,data:{success:false}}`도 예외 없이 반환됨을 재현했다.

또한 `api/admin/hotel/route.ts` 등의 PUT/DELETE는 저장 함수가 false여도 `ok({success})`를 반환한다. 일부 UPDATE는 영향 행 수를 확인하지 않으므로 존재하지 않는 행 수정도 성공처럼 끝날 수 있다.

수정:

1. 먼저 이동시간 호출자를 기존 envelope 계약에 맞춰 고친다. 다른 관리자 화면은 이미 `.data`를 사용하므로 공통 헬퍼를 무조건 unwrap하면 다른 곳이 깨진다.
2. `ApiResponse<T>` 공통 타입으로 호출부를 통일하고 `as T`만으로 응답 검증을 대신하지 않는다.
3. 저장 대상 없음은 404, 충돌은 409, 입력 오류는 400, DB 실패는 500. 실패를 성공 envelope 안에 넣지 않는다.
4. UPDATE/DELETE는 반환 행 또는 영향 행 수를 확인한다. 응답은 저장된 값과 최신 버전을 포함한다.
5. 빈 body/204를 정상 JSON 성공으로 처리하는 규칙을 제거하거나 비-JSON 전용 헬퍼로 분리한다.

검증: 새 이동시간 생성 직후 수정·삭제 가능, 중복 키/권한/없는 ID/DB 실패에서 성공 토스트 미표시. 기존 `.data` 소비 관리자 화면도 계약 테스트로 보호한다.

### A05. Entity 생성과 전용 테이블의 생명주기 통일

근거: `src/components/admin/EntityList.tsx` → `/api/admin/manage-entities` → `src/lib/crud/entities.ts:createEntity()`는 entities 및 entity_categories만 생성한다. 공개 `getHotels()`/`getGolfCourses()`는 전용 테이블에서 시작한다. Drawer의 전용 정보 저장은 기존 전용 행에 UPDATE만 한다.

별도 DB 트리거가 없다면 관리자 목록에는 호텔이 생겨도 공개 목록에는 보이지 않고, 전용정보 UPDATE는 0행 수정으로 끝난다. 실제 트리거 존재 여부를 먼저 조회한다.

수정:

1. 관리자 생성과 인라인 생성이 하나의 도메인 생성 서비스를 사용하게 한다.
2. HOTEL/GOLF/RESTAURANT 생성 시 실제 스키마의 필수값을 확인한 후 전용 행을 함께 생성한다. 트랜잭션/RPC로 묶어 중간 실패 시 전부 롤백한다.
3. 타입 변경은 원래 전용 데이터 보존·변환 규칙 없이 `entity_type`만 바꾸지 않는다. 현재 UI를 유지하면서 서버에서 불가능한 전환을 설명 가능한 오류로 차단하거나 안전한 변환 절차를 구현한다.
4. 기존 고아 entity는 조회하여 목록과 건수를 보고한다. 임의 삭제 또는 대량 기본값 덮어쓰기는 금지한다.

검증: 각 생성 화면에서 만든 호텔/골프장이 공개 목록·상세에 나타남. 전용정보 저장 후 DB와 새 세션이 일치함. 전용 행 생성 실패 시 부모와 카테고리 연결도 남지 않음.

### A06. 맛집 관계 데이터 손실 및 다중 테이블 원자성

근거: `src/lib/supabase-cms.ts:updateRestaurant()`의 1447–1469 부근은 `near_id`가 있으면 해당 맛집의 restaurant_locations 전부 삭제 후 하나만 삽입한다. 실패해도 로그만 남기고 true를 반환한다. `getRestaurantById()`는 첫 관계만 조회하고 기본 편집 모달은 form 전체를 전송한다.

즉, 관계 여러 개를 관리할 수 있는 별도 에디터와 단일 관계를 가정하는 기본 편집이 충돌한다. 이름만 수정해도 form에 담긴 near_id가 전체 관계 교체를 유발할 수 있다.

수정:

1. 기본 맛집 정보 수정은 관계 목록을 변경하지 않도록 책임을 나눈다.
2. 관계 수정은 관계 UUID를 대상으로 추가/수정/삭제한다. 전체 교체가 필요한 작업이면 별도 명시적 계약으로 정의한다.
3. 관계 삭제·삽입과 부모 수정의 원자성을 확보한다. DB 실패를 무시하지 않는다.
4. `getRestaurantById()`에서 사용하는 distance_text는 현재 select에 없으므로 필요한 관계 필드를 실제로 조회한다.
5. `syncEntityCategories()`도 오류를 숨기며 별도 요청으로 연결을 삭제·삽입하므로 동일하게 트랜잭션 대상으로 검토한다.

검증: 주변 관계 3개가 있는 맛집의 이름/전화만 바꿔도 관계 3개 유지. 한 관계 수정 시 나머지 유지. 삽입 실패를 주입해도 기존 관계 보존.

### A07. 저장 후 공개 캐시 갱신

근거: 공개 페이지 revalidate는 목록 300초, 상세 60초, FAQ 3600초인데 호텔·골프·FAQ·이동시간·콘텐츠·포함사항·Entity API 대부분에 명시적인 경로 갱신이 없다. 맛집 API는 요청 area가 있을 때 목록만 갱신한다.

`src/lib/revalidate-labels.ts:28–31`은 entities에서 `slug, area`를 조회하고 `type`을 필터링한다. 다른 실제 코드가 사용하는 것은 `area_id`/areas 관계와 `entity_type`이다. 쿼리 오류를 확인하지 않아 갱신 0건으로 조용히 끝난다. 운영 DB에 별도 레거시 컬럼이 있는지는 확인하지 않았지만 저장소의 스키마 계약과 불일치한다.

수정:

1. `slug, area_id, entity_type, areas(code)` 등 실제 스키마에 맞는 조회로 고치고 error를 확인한다.
2. 변경 전후 entity/area/category 정보로 영향을 받는 경로를 서버에서 계산한다. 요청 body에 area가 빠져도 갱신해야 한다.
3. 저장 완료 후 중앙 무효화 함수를 호출한다. 전체 사이트 강제 동적 렌더링으로 해결하지 않는다.
4. slug·지역 이동은 이전 URL과 새 URL 모두 갱신한다. 삭제는 삭제 전에 경로 정보를 확보한다.
5. 라벨 생성·수정·삭제, 노출 전환, 정렬도 갱신 대상이다. 현재 section-definitions POST에는 갱신이 없다.
6. DB 커밋 성공 후 캐시 갱신 실패는 “저장 실패”와 구별해 기록하고 재시도 가능하게 한다. 이미 성공한 INSERT를 사용자가 반복하게 만들지 않는다.

| 변경 데이터 | 영향 경로 예시 |
|---|---|
| 호텔/골프/맛집 | 해당 목록, 상세, 이를 참조하는 다른 상세 |
| 이동시간 | 해당 지역 메인, 이동시간을 보여주는 관련 상세 |
| FAQ | 지역 인기 질문, 지역/공통 FAQ, 연관 entity 상세 |
| 포함·불포함/콘텐츠 | 부모 entity 상세 및 실제 재사용 위치 |
| 지역/카테고리 | 홈, 지역 메뉴, 목록, 변경 전후 URL |
| 라벨/필드 | 해당 정의를 실제 사용하는 상세 |

검증: 저장한 관리자 화면뿐 아니라 별도 비로그인 세션의 첫 조회와 재조회에서 확인한다. ISR 응답 정책에 따른 첫 stale 응답 여부와 갱신 완료 시점도 기록한다.

### A08. 동적 카테고리와 라우트 불일치

근거: `src/app/[area]/page.tsx`가 모든 지역 카테고리를 `/${area}/${cat.code.toLowerCase()}`로 연결한다. 검토 커밋에는 `/[area]/golf`, `/hotel`, `/restaurant`, `/faq/[category]`만 있고 관광지 공개 page는 없다. 관광지 API·타입·편집 모달은 존재한다.

운영 HTML에서도 `/dos/attraction`, `/beppu/attraction` 링크를 확인했고, 두 URL을 실제 GET 조회한 결과 모두 HTTP 404였다. 비교 조회한 `/dos/hotel`, `/guide/driver`는 HTTP 200이었다. 관리자에서 카테고리를 만든다고 Next.js 라우트가 자동 생성되지는 않는다.

수정:

1. 현재 메뉴 모양을 유지하며 category→route resolver를 하나로 만든다.
2. 호텔/골프/맛집 전용 화면, 관광지 화면, 지역 FAQ, 공통 안내의 연결 규칙을 구분한다.
3. 관광지는 기존 목록/카드/상세 패턴으로 빠진 공개 라우트를 구현한다. 메뉴를 숨겨서 결함을 덮지 않는다.
4. 새 카테고리는 데이터 모델에 맞는 범용 콘텐츠/FAQ 경로로 연결한다. 지역 FAQ 화면이 현재 `resolveCommonCategory()`만 사용하는 점도 수정해 지역 카테고리를 거부하지 않게 한다.
5. 인기 FAQ 링크도 같은 resolver를 사용한다.

검증: 실제 노출 링크 전부 200 또는 의도된 이동. 활성 새 카테고리 생성·이름 변경·숨김 후 메뉴와 대상 콘텐츠가 일치한다.

### A09. 공개/관리자 조회의 활성 상태 정책

근거: `src/lib/area.ts:getActiveAreas()`는 필터 없이 fetchAreas()를 반환하고 resolveAreaBySlug()도 active를 검사하지 않는다. `getHotelById()`, `getGolfCourseById()`, `getRestaurantById()`는 상세에서 active를 제한하지 않으며 상세 page도 지역 일치만 확인한다. 제출된 anon SELECT 정책은 USING(true)이다.

수정:

1. 공개 resolver와 공개 상세 조회에서 비활성 지역·entity를 제외한다.
2. 관리자 조회는 비활성도 유지한다. 관리자가 다시 활성화할 수 있어야 한다.
3. 이름이 같은 getActiveAreas 두 구현을 정리하고 반환 타입/역할을 명확히 한다.
4. “숨김”이 검색·목록 제외인지 비공개인지 제품 규칙을 문서화한다. 비공개 목적이라면 API/RLS 직접 조회도 별도로 검증한다. 단순 UI 숨김을 접근 통제로 보고하지 않는다.

검증: 항목/지역 숨김 후 기존 상세 URL 접근, 다시 활성화, 관리자 재편집을 검증한다.

### A10. 지역 필터 누락과 fail-open 조회

근거: `getTravelTimes()`의 from_entity embed에는 `!inner`가 없고 내부 areas에만 `!inner`가 있다. 필터가 관계 데이터만 비우고 travel_times 최상위 다른 지역 행을 남길 가능성이 있다. 지도값 mapper는 관계 없음도 빈 이름의 행으로 반환한다.

또 `getFaq()`는 요청한 지역 또는 카테고리 ID를 찾지 못했을 때 필터를 생략한다. 잘못된 카테고리가 전체 FAQ 조회로 확대될 수 있다.

수정:

1. 두 지역 fixture로 실제 반환 행을 확인한 후, 필요 시 `from_entity:entities!from_entity_id!inner(...)` 또는 검증된 직접 FK 제한으로 최상위 행을 제한한다.
2. 잘못된 지역/카테고리는 빈 결과 또는 명시적 오류로 끝낸다. 필터 해석 실패가 전체 조회로 이어지지 않게 한다.
3. 도스+공통 FAQ는 의도된 범위다. 이 공통 기능을 제거하지 않는다.
4. 실제 row 수와 query 수를 기록한다. build-time 전체 slug 조회와 사용자 요청 중 전체 콘텐츠 조회를 구별한다.

검증: 도스/벳푸 각각 다른 이동시간과 FAQ를 넣어 상호 혼입 0건. 잘못된 area/category에서 전체 콘텐츠 반환 0건.

참고: [Supabase select — 관계 조회와 필터](https://supabase.com/docs/reference/javascript/select).

### A11. 관리자 1명의 오래된 폼 덮어쓰기만 가볍게 방지

근거: `crud/entities.ts:updateEntity()`, `crud/section-definitions.ts:updateSectionDefinition()`, supabase-cms의 수정 함수는 SELECT 후 updated_at을 비교하고 나서 ID만으로 UPDATE한다. 검사와 수정 사이에 다른 요청이 들어오면 둘 다 통과한다. 이동시간은 버전을 받지만 저장 함수가 무시한다. Drawer saveSubtype()은 버전을 전송하지 않는다.

수정:

1. UPDATE 자체에 ID와 expected version 조건을 적용한다. 결과 0행을 확인해 충돌/미존재로 처리한다.
2. 다중 테이블 저장은 같은 트랜잭션에서 공통 버전 검사·증가·저장을 수행한다.
3. 전용 테이블만 수정해도 해당 편집 버전이 증가하는지 확인한다. 기존 updated_at 트리거를 실제 조회한다.
4. 관리자 1명이므로 다중 사용자 협업·락 테이블·실시간 잠금·버전 이력 시스템을 만들지 않는다. 기존 updated_at 조건을 같은 UPDATE에 넣어 추가 SELECT 왕복을 줄인다. 두 탭의 오래된 폼만 감지하고 메시지는 “이 화면의 정보가 오래되었습니다. 새로 불러온 뒤 저장해주세요.”로 통일한다. 생성에는 버전 검사를 적용하지 않는다.

검증: 동일 버전으로 서로 다른 값을 두 번 저장하면 하나만 성공, 다른 하나는 409. 마지막 요청이 조용히 덮어쓰지 않는다.

### A12. 오류를 빈 콘텐츠로 숨기지 않기

근거: `api/admin/manage-entities/[id]/route.ts`의 9개 조회는 `.error`를 확인하지 않고 data만 사용한다. Supabase의 `{data:null,error}`는 Promise reject가 아니므로 Promise.all만으로 잡히지 않는다. `dynamic-labels.ts:getDynamicLabels()`도 fulfilled만 검사한다. 공개 상세의 allSettled 및 지역 page의 catch는 실패를 빈 배열로 바꾼다.

수정:

1. 모든 DB 응답에서 error를 확인한다. 핵심 데이터와 선택 보조 데이터를 구분한다.
2. 실제 0건과 조회 실패를 다른 상태로 관리한다. 기존 레이아웃 안에 짧은 실패/재시도 상태를 제공한다.
3. 관리자 폼은 조회 실패 필드를 빈 값으로 초기화해 저장하지 못하도록 한다.
4. ISR 재생성 중 실패 시 빈 성공 페이지로 정상 캐시를 덮지 않도록 한다. 필요한 오류 전파와 기존 정상 데이터 유지 정책을 적용한다.
5. `crud/response.ts:serverError()` 및 개별 API의 raw error.message 응답을 안정된 오류 코드/사용자 메시지로 바꾸고 상세는 서버에 기록한다.

검증: 전용 테이블 하나의 조회를 실패시켰을 때 “데이터 없음” 또는 저장 성공으로 처리하지 않음. 기존 콘텐츠가 빈 값으로 덮이지 않음.

### A13. 검증 명령과 문서가 실제로 실행되도록 복구

근거: package.json에 `verify:cms-schema = node scripts/verify-cms-schema.mjs`가 있지만 해당 파일이 추적된 트리에 없다. 실제 실행 결과 MODULE_NOT_FOUND, exit 1. 저장소에 CI workflow·회귀 테스트 파일도 확인되지 않았다. 외부 CI가 있는지는 확인하지 않았다.

PROJECT_DIGEST는 Prisma를 언급하지만 package.json에는 Prisma가 없다. AGENTS.md가 참조하는 `docs/04_ERD.md`도 트리에 없다. “모든 public page가 generateStaticParams 사용” 등의 문서 설명 역시 실제 구현과 다르다.

수정:

1. 누락 검증 스크립트를 복구해 tracked file로 커밋한다. 통과시키려고 명령만 삭제하지 않는다.
2. Node 22 및 lockfile 기준의 깨끗한 checkout에서 typecheck/lint/build를 수행한다.
3. 실제 재발 결함인 인증 거부, 응답 envelope, 이동시간 round-trip, 관계 보존, 공개 조회 범위, 원자적 충돌에 집중한 회귀 테스트를 추가한다.
4. CI에 타입·빌드·핵심 계약 테스트를 연결한다. DB 통합 검증은 격리 DB에서 실행한다.
5. 실제 스키마 위치와 현재 아키텍처를 문서에 기록하고 로컬-only 파일에 의존하지 않게 한다.

### A14. 지역 사전 생성 조건 오류

근거: `src/app/[area]/layout.tsx:8`은 `o.group === 'AREA'`를 검사하지만 getAdminOptions()는 지역에 `option_type:'AREA', group:''`를 반환한다. 정상 조회에서 지역 행이 선택되지 않는다. 오히려 group AREA 카테고리가 있다면 그 카테고리 코드가 지역 param으로 선택된다. 예외 fallback만 DOS/BEPPU를 반환한다.

수정: 활성 지역 전용 조회 또는 `option_type === 'AREA'` 필터를 사용하고 ALL은 제외한다. 실제 생성 params를 확인한다. 이 결함만으로 전체 사이트가 SSR이라고 단정하지 말고 build output으로 렌더링 모드를 확인한다.

### A15. 진단 API의 운영 노출

근거: `src/app/api/debug/query-timing/route.ts`에는 인증/환경 guard가 없으며 한 요청에서 warm-up과 세 번의 병렬 측정을 반복한다.

수정: 운영에서는 명시적으로 비활성화하거나 검증된 관리자만 제한적으로 실행하게 한다. 공개 요청에 반복 DB 작업이 노출되지 않게 한다. 운영 부하 검증 목적으로 이 endpoint를 연속 호출하지 않는다.

### A16. RLS 변경 범위 제한

근거: `20260909_anon_select_only_rls.sql`은 명시한 11개 테이블만이 아니라 `schemaname='public'`의 모든 정책을 순회 삭제한다. 이후 복구는 11개 테이블뿐이다. 재실행하면 뒤에 추가된 동적 필드 등 다른 테이블 정책을 제거할 수 있다.

수정: 기존 마이그레이션을 운영에 다시 실행하지 않는다. 새 수정안은 정확한 테이블/정책 allowlist만 대상으로 삼는다. 적용 전후 정책 diff를 검증하고 범위 밖 테이블의 정책이 같은지 확인한다. 운영에서 실제로 다른 정책이 사라졌는지는 미확인이다.

### A17. 사용자 QA 추가 사례 — 카테고리 생성이 “다른 관리자 수정”으로 실패

사용자 재현: 홈의 추가 모달에서 이름 `test`, 설명 `sdf`, 아이콘을 입력하고 저장했더니 “다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요.”가 표시되었다. 관리자 계정은 하나다.

확정된 코드 경로:

1. `HomeContentClient.tsx:63–69`: 새 항목이면 POST `/api/admin/options`.
2. `api/admin/options/route.ts`: 이름을 대문자·공백 치환·20자 자르기로 code로 만든다. `test`는 `TEST`가 된다.
3. 같은 API의 POST catch는 PostgreSQL 오류 `23505` 또는 duplicate 메시지를 HTTP 409와 “같은 이름/코드의 항목이 이미 존재합니다.”로 반환한다.
4. `admin-fetch.ts:21–22`는 **응답 body를 읽기도 전에 모든 HTTP 409를 `new ConflictError()`로 바꾼다.** 서버가 알려준 중복 원인이 소실된다.
5. `HomeContentClient.tsx:87–88`이 이 예외를 무조건 “다른 관리자” 메시지로 표시한다. GuideCategoriesClient에도 같은 오표시가 있다.

실제 헬퍼로 중복 카테고리 응답을 공급한 로컬 재현 결과:

```json
{"input":"duplicate category HTTP 409","actualClass":"ConflictError","actualMessage":"409_CONFLICT","uiShowsConcurrentEdit":true}
```

**판정:** 중복 오류를 동시 수정으로 오표시하는 결함은 확정이다. 사용자가 방금 보낸 요청의 실제 HTTP body/DB 로그는 확보하지 않았으므로 `TEST` 행의 존재나 정확한 충돌 constraint는 아직 확정하지 않는다. 이 POST 경로에는 updated_at 동시 수정 검사가 없다. “다른 관리자가 실제 수정했다”는 진단은 근거가 없다.

함께 확인할 재발 원인:

- options DELETE는 물리 삭제가 아니라 `active=false`이다. 과거 테스트 항목을 삭제했어도 code는 DB에 남아 있을 수 있다.
- 20자 자르기, 대소문자 및 공백 정규화 때문에 서로 다른 이름이 같은 code로 변환될 수 있다.
- 첫 POST는 성공했지만 화면/캐시 반영이 실패하여 다시 저장했다면 두 번째 POST만 중복일 수 있다.
- HomeContentClient는 성공 시 서버 option 전체 대신 입력값으로 객체를 재조립한다. 서버의 실제 code(20자 제한), sort, updated_at과 다른 값을 화면에 만들 수 있다. updated_at을 클라이언트 현재 시각으로 만들어서는 안 된다.

수정 지시:

1. **HTTP status와 업무 오류 코드를 분리한다.** 중복 생성은 409 + `DUPLICATE_CODE` 또는 정확한 `DUPLICATE_CATEGORY`, 실제 버전 충돌만 409 + `STALE_VERSION`을 사용한다. DB `23505`가 어떤 constraint인지 서버에서 확인해 잘못된 원인을 붙이지 않는다.
2. adminFetchJson에서 body부터 한 번 읽고 status/code/message를 보존한다. `STALE_VERSION`일 때만 동시 수정 전용 예외를 만든다. 코드 없는 409는 일반 충돌로 보여주며 다른 관리자가 있다고 단정하지 않는다.
3. 기존 공통 `conflict()` 사용처를 조사해 실제 버전 충돌 응답의 code를 명시한다. 공통 헬퍼만 고쳐 기존 409 처리와 envelope 소비자를 깨뜨리지 않는다.
4. 두 카테고리 생성 화면 모두 서버 메시지·코드로 분기한다. 생성 실패에서 새로고침을 반복하라고 안내하지 않는다. 입력값을 유지한다.
5. 읽기 전용 SQL로 `categories`의 code/label/active/group_type/id와 해당 unique constraint를 확인한다. `TEST`와 정규화 충돌 후보를 확인하고 숨김 행인지 기록한다. 관계 수를 확인하기 전 삭제하지 않는다.
6. 사용자가 명시적으로 숨긴 항목이면 숨김 상태와 중복을 안내한다. 사용자가 삭제한 항목은 A18에 따라 DB에서 실제 제거되어 같은 코드를 다시 생성할 수 있어야 한다. 과거 active=false 행은 숨김/삭제 의도를 구분할 수 없으므로 모두 자동 제거하지 않는다. 대상과 의존성을 확인해 정리안을 제시한다.
7. 표시 이름과 안정된 내부 code를 분리하는 정책을 정한다. 서로 다른 카테고리의 정규화 충돌은 안전한 suffix/고유 식별자로 처리할 수 있지만, 같은 항목 반복 제출을 무조건 새로운 항목으로 복제하지 않는다. 사전 중복 조회만으로 경쟁을 막을 수 없으므로 DB unique constraint는 유지한다.
8. 생성 성공 시 서버의 실제 저장 행을 AdminOption DTO로 매핑해 반환하고 그대로 소비한다. 로컬에서 code/sort/updated_at을 추측하지 않는다. ID가 없으면 성공 UI로 넘어가지 않는다.
9. 성공 후 홈·공통 안내·관련 메뉴 캐시를 갱신한다. 실패 재시도로 같은 항목을 생성하지 않도록 버튼 중복 제출 방지와 요청 재시도 정책을 검증한다.

필수 회귀 사례:

| 입력/상황 | 기대 결과 |
|---|---|
| 처음 쓰는 이름/코드 | 201, 실제 ID와 서버 값 반환, 새 세션 메뉴 노출 |
| 같은 코드 재등록 | 정확한 중복 메시지, “다른 관리자” 문구 없음 |
| 명시적으로 숨긴 동일 코드가 active=false | 숨김 항목 충돌 안내, 기존 관계 보존 |
| 카테고리 삭제 후 같은 코드 재등록 | DB 실제 삭제 확인 후 201 생성 성공 |
| 같은 20자 접두사를 가진 다른 이름 | 정한 code 정책에 따라 충돌 없이 구분 또는 명확한 안내 |
| 실제 오래된 버전으로 수정 | STALE_VERSION과 최신 데이터 안내 |
| 코드 없는 일반 409 | 일반 충돌 메시지, 동시 수정으로 단정하지 않음 |
| 빠른 더블클릭/응답 유실 후 재시도 | 불필요한 중복 행 생성 없음 |
| 서버 성공 후 reload | 같은 ID/code/sort/updated_at 유지 |

이 항목은 단계 2의 응답 계약 수정(A04)과 함께 우선 처리한다. 단순 문구 교체만 하고 카테고리 추가 완료라고 보고하지 않는다. 실제 생성·새로고침·별도 비로그인 조회를 확인해야 한다.

### A18. 삭제는 DB 실제 DELETE — 숨김과 분리

사용자 확정 정책: 삭제를 누르고 기존 확인 모달에서 확정하면 대상 행과 그 대상에만 종속된 데이터는 DB에서 실제로 지운다. active=false/deleted_at 설정 후 삭제 성공으로 보고하지 않는다. 휴지통·복구 테이블·삭제 보관함은 새로 만들지 않는다.

대상 경로: `api/admin/options` DELETE와 `updateAdminOption`, `deleteFaq`, `deleteTravelTime`, `deleteContentSection`, `deleteIncludeExclude`, 엔티티/카테고리/지역 CRUD와 compound-delete RPC를 함께 대조한다. 일부 경로는 이미 물리 삭제하므로 그대로 활용한다. 코드가 숨김인지 삭제인지 함수 이름만으로 판단하지 않는다.

| 대상 | DB 처리 기준 |
|---|---|
| FAQ/이동시간/포함·불포함/콘텐츠 단일 항목 | 해당 PK 행 실제 DELETE |
| 호텔·골프장·맛집·관광지 | 해당 entity와 전용 행, 그 entity에 종속된 필드값·콘텐츠·연결 행 삭제 |
| 연결 행 | 해당 연결만 삭제; 연결 상대 호텔·골프장·맛집은 보존 |
| 카테고리 | 카테고리 및 전용 FAQ/범위·연결 행 삭제; 공유 entity는 보존하고 주 카테고리 참조 정리 |
| 지역 | 기존 영향 확인 모달에 포함된 지역 소속 데이터만 트랜잭션으로 삭제; 다른 지역과 공통 안내는 보존 |
| 공통 필드 정의 | 해당 정의 및 종속 값·scope만 삭제; 다른 정의와 entity는 보존 |
| 숨김 토글 | active=false 등으로 유지; DELETE 호출과 혼용 금지 |

실행 지시:

1. 실제 FK와 의존성을 조회해 삭제 대상을 결정한다. DB까지 삭제한다는 의미를 연결된 다른 독립 콘텐츠까지 무조건 연쇄 삭제하는 것으로 해석하지 않는다.
2. 단일 항목은 PK 조건 DELETE 후 실제 삭제 ID를 반환한다. 여러 테이블은 기존 FK CASCADE 또는 기존 원자적 RPC를 우선 활용한다. 새 프레임워크나 테이블을 추가하지 않는다.
3. 부모 FK가 소유 관계인지 공유 참조인지 구분해 CASCADE/SET NULL/연결 삭제를 선택한다. FK 오류를 무시하거나 RLS를 해제해서 성공시키지 않는다.
4. 기존 삭제 확인 모달을 재사용한다. 삭제 대상과 이미 제공하는 영향 건수를 정확히 보여준다. 단순 삭제에 새 승인 화면을 여러 개 만들지 않는다.
5. 삭제 전 필요한 URL 정보를 확보하고 commit 성공 후 목록·상세·FAQ·메뉴 캐시를 갱신한다. 캐시만 지우고 DB 행을 남겨서는 안 된다.
6. 실패 시 삭제 성공 토스트를 표시하지 않는다. 없는 ID 재삭제는 일관된 404/이미 삭제 응답으로 처리한다. 한 단계 실패 시 전체 삭제를 롤백한다.
7. 과거 soft-delete 잔여 행은 숨김과 구별해 조사한다. 모든 inactive 행 일괄 삭제는 금지한다. 이번 문서는 특정 운영 행의 즉시 삭제 명령이 아니다.

완료 기준:

- 카테고리 생성 → 실제 삭제 → 동일 코드 재생성이 성공한다.
- 삭제된 PK의 DB 조회 결과가 0행이며 종속 데이터에 고아 행이 없다.
- 숨김 항목은 DB에 남아 다시 표시할 수 있다. 삭제 항목은 관리 목록에도 남지 않는다.
- 관계 상대의 독립 콘텐츠, 다른 지역과 공통 안내는 유지된다.
- 삭제된 상세 URL은 캐시 갱신 후 404, 공개 목록에는 미노출이다.
- 격리 fixture에서 다중 테이블 삭제 실패 시 원상 유지됨을 검증한다.

## 5. 구조와 중복 코드 정리 방향

`supabase-cms.ts`는 약 2,500줄이며 읽기·쓰기·legacy 필드 변환·지역 캐시·slug/UUID 해석이 함께 있다. 여기에 `lib/crud/*`가 또 다른 쓰기 경로를 제공한다. 같은 데이터에 대한 두 구현이 위의 계약 차이를 만든다.

권장 책임 구분은 다음과 같다. 파일명은 제안이며 전면 이동을 한 번에 실행하지 않는다.

| 책임 | 규칙 |
|---|---|
| 공통 DTO/검증 | UUID, slug, boolean, 숫자, null, 응답 envelope 정의 |
| 공개 read | active 및 지역/카테고리 범위 적용, 필요한 열만 반환 |
| 관리자 read | 비활성 항목 포함, 편집 버전 포함 |
| 도메인 write | 기존 인라인 API와 관리자 API가 같은 저장 서비스 호출 |
| cache invalidation | 저장된 전후 값을 기반으로 관련 경로 계산 |
| UI | 기존 화면 유지, 실제 저장 응답으로 상태 갱신 |

세부 원칙:

- 우선 기존 API를 adapter로 남기고 내부 서비스부터 통일한다. 공통 헬퍼 반환값을 한 번에 바꾸지 않는다.
- boolean 문자열 TRUE/FALSE와 실제 boolean을 경계에서 변환한다. `Boolean('FALSE')` 같은 해석을 허용하지 않는다.
- `.select('*')` 및 Record<string,unknown>/강제 타입 단언은 핵심 경로부터 정확한 타입과 열로 치환한다.
- 지역 캐시 중복과 진행 중 요청 공유를 정리하되, 서버 프로세스 내 Map 무효화가 전체 배포 인스턴스에 전파된다고 가정하지 않는다.
- ModalShell, EditModalShell, FormModal, 이동시간 자체 모달은 목적 차이를 먼저 비교한다. 공통 외형만 보고 일괄 합치지 않는다. 데이터 결함 수정이 끝난 후 작은 단계로 정리한다.
- 동적 필드는 기존 field_definition_scopes와 getDynamicLabels(entityType만 받음)의 적용범위를 별도 대조한다. 실제 요구 범위와 사용 데이터를 확인하기 전 임의 삭제하지 않는다.
- 현재 모바일/PC UX와 공통 질문, 이동시간 기능을 유지한다. “단순화”를 기능 삭제의 근거로 쓰지 않는다.

## 6. 에이전트 실행 순서

### 단계 0 — 기준선과 재현

- [ ] 현재 HEAD와 본 문서 커밋 diff 확인; 이미 수정된 결함은 증거를 남겨 제외.
- [ ] git status로 기존 작업 보호, 별도 audit-fixes 브랜치 사용.
- [ ] AGENTS.md 및 실제 스키마/마이그레이션 읽기.
- [ ] DB 카탈로그를 읽기 전용으로 조회해 컬럼·FK·트리거·함수 권한 확인.
- [ ] 화면별 요청 DTO, API 응답, DB 저장 필드, 공개 조회 필드를 작은 표로 기록.
- [ ] 실제 운영 배포 commit/URL을 확인하고 기준 HTTP 상태 기록.

### 단계 1 — 접근 통제

A01, A02, A15를 해결한다. 기존 비밀번호 모달 유지. P0가 해결되기 전에 기능 추가를 하지 않는다.

### 단계 2 — 데이터 무결성과 성공 판정

A03, A04, A05, A06, A11, A17, A18을 기능별 독립 커밋으로 해결한다. 공통 DTO/응답 변경은 호출부 목록과 함께 검증한다.

### 단계 3 — 공개 데이터 일치

A07, A08, A09, A10, A12, A14를 해결한다. 메뉴·FAQ·이동시간을 모두 보존하고 도스/벳푸를 교차 검증한다.

### 단계 4 — 재발 방지와 내부 정리

A13, A16과 필수 구조 정리를 진행한다. 기존 동작을 보호하는 회귀 검증을 확보한 후 파일을 작게 나눈다.

구조·DB·auth 변경은 저장소 AGENTS.md의 사전 승인 규칙을 따른다. 이번 사용자의 요청은 감사와 수정 지시서 작성이며 운영 변경 실행 요청은 아니다. 실제 변경 단계에서는 먼저 구체적인 코드 diff, 마이그레이션, 검증 결과, 롤백 절차를 준비한 후 세션에서 이미 허용된 범위를 확인한다. 일반적인 읽기·재현·수정안 준비를 이유 없이 중단하지 않는다.

## 7. 필수 완료 검증표

| 검증 | 통과 조건 |
|---|---|
| 인증 | 비정상/만료 세션은 API 거부, 정상 로그인·로그아웃 작동 |
| 관리자 UI | 로그인 후 인라인 버튼·관리자 메뉴 표시, 비로그인에서는 미노출 |
| 이동시간 | 생성→수정→새 세션 조회→삭제가 DB와 일치, ID/시간/관계 보존 |
| Entity | 인라인·관리자 양쪽에서 생성한 호텔/골프/맛집이 동일하게 동작 |
| 맛집 관계 | 기본정보 수정 후 관계 3개 유지, 실패 시 부분 손실 없음 |
| FAQ | 도스/벳푸/공통/연관 상세의 질문 범위 일치 |
| 하위 콘텐츠 | 포함·불포함·콘텐츠·라벨 CRUD 후 공개 화면 반영 |
| 노출 상태 | 숨김 후 목록·직접 상세 정책 일치, 관리자 복구 가능 |
| 오래된 폼 | 같은 버전 요청 중 하나만 성공, 오래된 폼은 정확한 안내; 다중 관리자 시스템 미도입 |
| DB 실제 삭제 | 대상·종속 행 제거, 공유 콘텐츠 보존, 동일 코드 재생성 성공 |
| 경량 인증 | ENV 비밀번호 하나와 서명 쿠키만 사용; 인증용 DB 왕복·회원 시스템 없음 |
| 지역 범위 | 선택하지 않은 지역의 콘텐츠 행을 불필요하게 반환하지 않음 |
| 공개 링크 | 운영 메뉴와 생성된 카테고리의 링크에 의도치 않은 404 없음 |
| 오류 처리 | DB 실패와 빈 결과를 구분, 실패 시 성공 토스트 없음 |
| 캐시 | 별도 비로그인 세션에서 변경 반영; 이전 slug/경로도 무효화 |
| 화면 보존 | 텍스트 DOM·computed style·동작으로 모바일/태블릿/PC 구조 보존 확인 |
| 새 checkout | 필요한 스크립트 모두 존재, Node 22에서 typecheck/lint/build 및 핵심 테스트 성공 |
| 배포 | Vercel READY와 해당 commit 확인 후 실제 공개 smoke 확인 |

실제 운영 데이터로 생성/삭제 회귀 테스트하지 않는다. 별도 DB의 fixture를 사용하고 운영에는 허용된 읽기 smoke만 한다. 인증 우회·삭제 RPC 검증은 격리 환경에서만 진행한다.

## 8. 완료 보고 양식

```text
기준 commit / 변경 commit:
해결한 ID:
변경 파일과 목적:
DB 변경 여부 / 승인된 마이그레이션:
재현한 실패 → 수정 후 결과:
저장된 실제 값과 별도 세션 조회 결과:
실행한 명령 / exit code:
배포 commit / READY 여부 / 공개 smoke:
미확인 항목과 이유:
롤백 방법:
```

보고 상태는 CODE_VERIFIED / LOCAL_REPRODUCED / DB_VERIFIED / LIVE_READ_VERIFIED / BLOCKED처럼 근거에 맞춰 구분한다. 실행하지 않은 테스트를 PASS로 보고하지 않는다. 빌드 통과를 DB 저장·운영 기능 검증으로 대체하지 않는다.

## 9. 이번 감사에서 수행한 검증

- GitHub main을 실제 clone하고 HEAD `3262dd5…` 확인, 코드 변경 없음.
- GitHub commit status에서 Vercel success 확인.
- 실제 `adminFetchJson`을 mock HTTP 응답으로 실행해 ID 추출 불일치 및 중첩 실패 성공처리 확인.
- `npm run verify:cms-schema` 실행: MODULE_NOT_FOUND, exit 1. 실행 runtime은 Node 24.19.0; 프로젝트 요구는 Node 22. 파일 누락은 runtime 차이와 별개의 원인이다.
- 운영 `/`, `/dos`, `/beppu`, `/guide`에서 HTTP 200 및 제목 “일본 골프 여행 가이드” 확인. 도스·벳푸 관광지 링크도 HTML에서 확인.
- 운영 `/dos/attraction`, `/beppu/attraction`은 실제 HTTP 404, `/dos/hotel`, `/guide/driver`는 200 확인.
- 전체 브라우저 렌더·로그인 CRUD·운영 DB 스키마/권한·실제 배포 SHA 동일성은 미검증.

소스 근거 링크는 다음 기준으로 확인할 수 있다:

- [인증 구현](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/src/lib/auth.ts)
- [CMS 저장·조회 구현](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/src/lib/supabase-cms.ts)
- [관리자 Entity 서비스](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/src/lib/crud/entities.ts)
- [이동시간 UI](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/src/components/AreaTravelTimesClient.tsx)
- [캐시 갱신 구현](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/src/lib/revalidate-labels.ts)
- [삭제 함수 마이그레이션](https://github.com/Sup-AI-Main/japan-chat-web/blob/3262dd56bd70ea8f30ce399e79d2bb89146faf3a/supabase/migrations/20260911071552_phase3c_atomic_delete.sql)

## 10. 구현 명세 — 사용할 함수·라이브러리·입출력·기대 결과

이 절은 구현 방향을 고정한다. 아래의 **신규 함수는 제안하는 구현 계약**이며 현재 저장소에 존재한다고 주장하는 것이 아니다. 현재 함수는 지정된 이름을 유지하고 내부를 고친다. DB 컬럼·FK는 실제 스키마 확인 후 사용한다. 이 문서의 코드는 수정 방향을 구체화한 예시이며 실행 검증이 끝난 운영 코드가 아니다.

### 10.1 의존성 및 파일 배치 고정

| 용도 | 사용할 것 | 추가하지 않을 것 |
|---|---|---|
| 관리자 비밀번호/쿠키 | 기존 `auth.ts`, `node:crypto`, `next/headers` | Supabase Auth, NextAuth, Clerk, jose, 회원/역할/세션 테이블 |
| DB CRUD | 설치된 `@supabase/supabase-js`, 기존 `getSupabaseAdmin()` / `getSupabaseServer()` | Prisma, 새 ORM, 별도 백엔드 서버 |
| 다중 테이블 원자성 | PostgreSQL 함수 + 기존 client의 `.rpc()` | 여러 HTTP 요청을 Promise.all로 묶고 트랜잭션이라고 보고하는 것 |
| 입력 검증 | 기존 `crud/validation.ts` 확장 | Zod 등 새 검증 패키지의 불필요한 도입 |
| 공개 캐시 | 기존 ISR + `revalidatePath` from `next/cache` | Redis, 전체 force-dynamic, cacheComponents 도입 |
| UI 상태 | 기존 React 및 Zustand | 새 전역 상태 라이브러리 |
| 단위 검증 | `node:test`, `node:assert/strict`, 설치된 `tsx` | Jest/Vitest 추가 |
| 브라우저 회귀 | 설치된 `@playwright/test` | 새 브라우저 테스트 프레임워크 |
| 읽기 전용 DB 감사 | 설치된 `pg`, ENV DIRECT_URL | 브라우저에 DB 비밀키 제공 |

인증을 위해 DB를 조회하지 않는다. 서명 검증은 관리자 경로에서 서버 메모리 계산으로 끝낸다. 성능 수치는 측정 전 보장하지 않는다.

### 10.2 A01 — 최소 관리자 인증의 정확한 함수 계약

파일: `src/lib/auth.ts`와 신규 순수 함수 파일 `src/lib/admin-session.ts`.

사용 import:

```ts
import 'server-only'; // auth.ts 등 서버 진입부
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
```

`admin-session.ts`는 Next.js cookies를 가져오지 않는 순수 모듈로 만들고 서버 파일에서만 import한다. 테스트는 이 순수 모듈을 직접 검증한다.

신규 함수 시그니처:

```ts
type AdminSession = { v: 1; iat: number; exp: number; nonce: string };
issueAdminToken(password: string, nowSeconds: number): string;
verifyAdminToken(token: string, password: string, nowSeconds: number): boolean;
```

알고리즘을 다음으로 고정한다:

1. 유효기간은 상수 `ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60`으로 둔다. 관리자 설정 화면은 만들지 않는다.
2. 서명키: `createHmac('sha256', password).update('japan-guide:admin-cookie:key:v1').digest()`.
3. payload: v=1, 정수 iat/exp, `randomBytes(16).toString('base64url')` nonce.
4. JSON payload의 base64url 문자열을 HMAC-SHA256으로 서명하고 `payload.signature` 형식으로 반환한다. 비밀번호/파생키는 payload에 포함하지 않는다.
5. 검증은 token 길이 제한(예: 2048), 두 segment 형식, 서명 디코딩 길이 32바이트를 확인한 뒤 `timingSafeEqual`을 사용한다. JSON 파싱 실패·필드 타입 오류·v 불일치·미래 iat·만료·허용 TTL 초과는 false다.
6. `login(password)`는 ENV 값 없으면 false. 입력과 ENV를 각각 SHA-256 digest로 만든 동일 길이 Buffer를 timingSafeEqual로 비교한다. 이는 입력 길이 때문에 비교 함수가 예외를 내지 않게 하는 방식이며 비밀번호 저장용 해시 시스템을 새로 만드는 것이 아니다.
7. `setAuthCookie()`는 로그인 검증 성공 경로에서만 token을 발급한다. HttpOnly, production Secure, SameSite=strict, path=/, maxAge=TTL을 설정한다.
8. `isAuthenticated()`는 쿠키를 읽어 verifyAdminToken 호출; DB 호출 0회. `removeAuthCookie()`는 현재 쿠키 삭제.
9. `ADMIN_PASSWORD`는 강한 난수 비밀번호를 사용해야 한다. 토큰을 얻은 사람이 약한 ENV 비밀번호를 오프라인 추측할 수 있으므로 임의의 짧은 비밀번호를 안전하다고 보고하지 않는다.

테스트 기대: 정상 token=true; payload 1글자 변조=false; signature 변조=false; 만료=false; 이전 비밀번호로 발급한 token을 변경된 비밀번호로 검증=false. 공개 page/layout에는 cookies()를 추가하지 않는다.

### 10.3 A04/A17 — 오류와 응답 처리 구현

변경 파일: `src/lib/admin-fetch.ts`, `src/lib/crud/response.ts`, `src/app/api/admin/options/route.ts`, HomeContentClient 및 GuideCategoriesClient.

`adminFetchJson<T>`의 반환은 **기존대로 envelope 전체**다. 기존 `.data` 호출부를 유지한다. 신규 `AdminApiError`에 status/code/message를 보관하고 `ConflictError`는 STALE_VERSION 전용으로만 사용한다.

```ts
class AdminApiError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
  }
}
// 실제 구현에서 export 및 기존 import 호환 유지
class ConflictError extends AdminApiError {
  constructor(message = '이 화면의 정보가 오래되었습니다. 새로 불러온 뒤 저장해주세요.') {
    super(message, 409, 'STALE_VERSION');
  }
}
```

처리 순서: fetch → text 1회 읽기 → JSON object 검증 → status와 body.success 검사 → 오류 code로 예외 분기 → 정상 envelope 반환. `res.status === 409` 선행 throw를 삭제한다. Headers는 `new Headers(options.headers)`로 만든 후 Content-Type 기본값을 설정하고 `{...options, headers}` 순서로 fetch에 전달한다.

서버 helper 추가:

```ts
staleVersion(message?: string); // 409, code: STALE_VERSION
duplicateCode(message?: string); // 409, code: DUPLICATE_CODE
```

응답을 다음 형태로 고정한다:

```json
{"success":false,"code":"DUPLICATE_CODE","error":"같은 코드의 카테고리가 이미 있습니다."}
```

이 응답은 중복 안내를 표시하며 ConflictError로 분류되지 않아야 한다. 생성 성공 예:

```json
{"success":true,"data":{"id":"<DB UUID>","option":{"id":"<DB UUID>","option_type":"CATEGORY","code":"TEST","label":"test","icon":"🍽️","description":"sdf","group":"COMMON","sort":7,"active":"TRUE","updated_at":"<DB timestamp>"}}}
```

`HomeContentClient.handleSubmit()`은 `result.data.option`의 필수 필드를 검사한 후 onSaved에 전달한다. `new Date().toISOString()`으로 DB 버전을 만들어 넣지 않는다. 옵션 PUT도 저장 행을 재조회/반환해 같은 DTO를 제공한다.

카테고리 생성은 기존 내부 code 정책을 우선 유지하면서 중복을 정확히 반환한다. 자동 suffix 생성은 이번 수정에서 필수로 넣지 않는다. 삭제 후 동일 code 재생성이 성공하도록 A18을 먼저 고친다. 기존 다른 이름 간 정규화 충돌은 입력 오류로 명확히 보여주고 별도 정책 변경 없이 임의의 code를 만들지 않는다.

### 10.4 A03 — 이동시간 요청/저장/표시 명세

기존 `appendTravelTime`, `updateTravelTime`, `getTravelTimes`, `AreaTravelTimesClient` 및 `api/admin/travel-times`를 함께 변경한다. 공통 DTO는 `src/lib/types.ts`에 추가한다.

```ts
type TravelTimeWrite = {
  id?: string;
  area: string;
  from_id: string; // 기존 UI 호환: slug 또는 UUID, 서버에서 UUID 해석
  to_id: string;
  product_reference_minutes: number | null;
  display_time: string;
  min_minutes: number | null;
  max_minutes: number | null;
  directions_url: string;
  sort: number;
  updated_at?: string;
};
```

신규 순수 함수 `parseTravelTimeInput(value: string)`을 validation.ts에 만든다. 공백 trim 후 정규식으로 전체 문자열을 검사한다. `35`, `35분`은 기준 분 35; `30~40분`은 min=30/max=40, 기준 분=null, display_time='30~40분'; 빈 값은 숫자 null 및 display_time=''; `-1`, `3abc`, 역전 범위 `40~30`은 400. 0은 유효한 0분이다. 현재 입력 UI는 유지한다.

PUT은 from_id/to_id도 검증된 FK로 갱신한다. GET mapper의 신규 `formatTravelTime(row)`는 display_time → min/max → product_reference_minutes 순으로 표시하며 null 여부로 검사한다. truthiness로 0을 누락하지 않는다.

서버 응답: `created({id: row.id, travelTime: mappedRow})` / `ok({id: row.id, travelTime: mappedRow})`. mappedRow는 DB 값에서 나온 공개 TravelTime 필드 및 updated_at을 포함한다. `handleSaved`는 이 객체를 그대로 목록에 반영한다. 입력 form 객체를 DB 결과처럼 사용하는 현재 코드를 제거한다.

기대: POST 35분 후 DB 기준분=35; PUT 45분 후=45; 범위 입력 후 최소/최대=30/40; 새 브라우저에서도 동일; 생성 직후 ID가 비지 않아 수정·삭제 가능.

### 10.5 A18 — 실제 삭제 구현 예시와 연결 범위

단일 테이블은 기존 Supabase client로 다음 패턴을 사용한다. tableName은 사용자 입력을 직접 받지 않고 서버에서 정한 상수 또는 allowlist만 사용한다.

```ts
const { data, error } = await getSupabaseAdmin()
  .from('travel_times')
  .delete()
  .eq('id', id)
  .select('id')
  .maybeSingle();
if (error) throw error;
if (!data) return notFound('이미 삭제되었거나 존재하지 않는 항목입니다.');
return ok({ deleted: true, id: data.id });
```

이 예시는 route 수준이다. 저장 함수가 Response를 반환하도록 기존 계층을 섞지 말고, 저장 함수는 삭제 ID/null 또는 공통 도메인 오류를 반환하고 route가 위 HTTP 응답을 만든다.

| 현재 함수/진입점 | 구체적인 변경 |
|---|---|
| `deleteTravelTime(id)` | active=false UPDATE → PK DELETE/select('id') |
| `deleteFaq(id)` | 동일 변경; 해당 FAQ 캐시 경로는 삭제 전에 확보 |
| `deleteContentSection(id)` | 현재 동작 확인 후 실제 DELETE로 통일 |
| `deleteIncludeExclude(id)` | 현재 동작 확인 후 실제 DELETE로 통일 |
| options DELETE | `updateAdminOption({active:'FALSE'})` 제거; ID로 종류를 해석하고 기존 `deleteCategoryFull`/`deleteAreaFull` 등 실제 export된 삭제 함수와 계약을 확인해 호출 |
| golf/hotel/restaurant DELETE | 기존 `deleteEntityFull` 등 원자적 공통 삭제 경로로 연결; 전용 row만 삭제해 부모를 남기지 않음 |
| 숨김 toggle | 기존 active UPDATE 유지; 삭제 함수 호출 금지 |

`compound-delete.ts`의 실제 함수 시그니처를 확인하여 기존 영향 확인을 재사용한다. 신규 삭제 RPC가 필요한지 판단하기 전에 기존 FK CASCADE를 확인한다. 카테고리 삭제에서 entity 자체를 같이 지우는 기존 구현이 있다면 A18의 공유 entity 보존 정책에 맞게 고친다. 무조건 기존 함수를 재사용하고 끝내지 않는다.

DELETE 후 기대 JSON은 `{success:true,data:{deleted:true,id}}`. DB 대상 count=0, 같은 code 생성=201, 관련 없는 entity count는 이전과 동일해야 한다.

### 10.6 A05/A06/A11 — 트랜잭션과 조건부 갱신

기존 진입 함수는 유지한다: `createEntity`, `appendHotel`, `appendGolfCourse`, `appendRestaurant`, `updateEntity`, `updateHotel`, `updateGolfCourse`, `updateRestaurant`.

신규 내부 서비스 `createEntityWithSubtype(input)`을 `src/lib/crud/entities.ts`에 구현하고 양쪽 생성 API가 사용한다. 원자적 DB 함수가 현재 없다면 `create_entity_with_subtype`라는 RPC를 제안한다. 실제 필수 컬럼을 조회한 뒤 typed SQL 인수와 반환 행을 정의한다. 함수 안에서 entity → 필요한 subtype → category 연결을 한 트랜잭션으로 저장한다. JSON을 임의 동적 SQL로 넘기지 말고 허용 필드만 명시한다. 권한은 A02 기준을 적용한다.

`updateRestaurant`의 near_id 처리에서 전체 restaurant_locations 삭제를 제거한다. 기본정보 저장에서는 관계를 건드리지 않는다. 기존 restaurant-locations API의 개별 CRUD를 사용하고 관계 ID 기준으로 변경한다.

단일 행 버전 검증은 다음 DB 문장과 동등해야 한다:

```sql
UPDATE public.entities
SET display_name = $1, updated_at = clock_timestamp()
WHERE id = $2 AND updated_at = $3
RETURNING id, display_name, updated_at;
```

기존 trigger가 updated_at을 갱신한다면 중복 대입하지 않는다. 단일 Supabase update는 `.eq('id', id).eq('updated_at', expected).select(...).maybeSingle()` 사용. 0행일 때만 후속 존재 확인으로 404와 STALE_VERSION을 구분한다. 정상 저장마다 사전 SELECT를 추가하지 않는다.

다중 테이블 수정은 RPC 안에서 이 조건부 부모 UPDATE를 먼저 실행하고 이후 subtype 저장을 수행한다. 부모 갱신 0행이면 전체 종료, subtype 실패면 전체 롤백. subtype만 편집해도 부모 버전을 갱신한다.

기대: subtype 삽입 실패 시 entity/연결 row 모두 0; 맛집 이름 변경 후 기존 관계 3개 유지; 같은 expected timestamp 요청 2개 중 성공은 1개.

### 10.7 A07 — 캐시 무효화 함수 고정

신규 `src/lib/revalidate-content.ts`:

```ts
type ContentChange = {
  kind: 'entity' | 'faq' | 'travelTime' | 'category' | 'area' | 'labels';
  paths: string[]; // 서버가 DB의 변경 전후 값으로 만든 실제 URL
};
export function revalidateContent(change: ContentChange): void {
  for (const path of new Set(change.paths)) revalidatePath(path);
}
```

import는 `revalidatePath` from `next/cache`. route handler에서 성공한 mutation 뒤 호출한다. paths는 요청 body에서 받은 임의 문자열로 구성하지 않고 routes.ts/DB 값에서 계산한다. 쿠키나 사용자별 정보는 공개 캐시에 포함하지 않는다.

기존 `revalidateEntityPaths(type)`는 select를 `slug, areas(code)` 관계 및 entity_type 필터로 고치고 error를 검사한다. 해당 FK 관계명이 다르면 실제 schema에 맞춘다. entity.area 및 type 컬럼을 계속 쓰지 않는다.

예: DOS 호텔 수정 → `/dos/hotel`, `/dos/hotel/<slug>` 및 실제 참조 페이지. 공통 DRIVER FAQ 수정 → `/guide/driver` 및 그 질문을 사용하는 지역 메인. 변경 전에 만든 경로와 이후 경로를 합집합 처리한다.

관리자 화면은 저장 응답으로 갱신하고 필요한 경우 `router.refresh()`를 호출한다. 이것을 서버 캐시 무효화 대체로 사용하지 않는다. Route Handler의 revalidatePath는 해당 경로가 다음 방문 때 재검증되도록 하는 동작이며, 모든 열린 브라우저에 자동으로 변경을 push한다고 설명하지 않는다.

### 10.8 A08/A09/A10/A14 — 조회와 링크 함수 지정

| ID | 파일/함수 | 구현 및 통과 결과 |
|---|---|---|
| A08 | `routes.ts`에 `publicCategoryPath(area, category)` 신규 | GOLF/HOTEL/RESTAURANT/ATTRACTION는 전용 경로, COMMON은 guideCategory, 나머지 AREA FAQ는 areaFaq. 링크 만드는 page/인기질문 모두 사용; 모든 실제 href 200 |
| A08 | 신규 `[area]/attraction/page.tsx`, `[area]/attraction/[id]/page.tsx` | 기존 getAttractions/getAttractionById 사용; 활성·지역 검증 후 기존 카드/상세 UI 패턴 렌더; 임시 하드코딩 데이터 금지 |
| A09 | `area.ts:getActiveAreas`, 공개 `resolveArea`, getHotelById/getGolfCourseById/getRestaurantById | active 조건 적용; 관리자용 resolver는 유지. 숨김 상세는 404, 관리자에서 재활성화 가능 |
| A10 | `getTravelTimes(area)` | `from_entity:entities!from_entity_id!inner(...areas!inner(code))` 방식의 최상위 inner 관계와 area 필터를 실제 FK로 검증; 다른 지역 row 0 |
| A10 | `getFaq(area,category)` | 인자가 있지만 ID를 못 찾으면 전체 조회로 확대하지 않고 [] 반환; 유효 DOS+공통만 유지 |
| A14 | `[area]/layout.tsx:generateStaticParams` | option_type==='AREA' && active!=='FALSE' && code!=='ALL'; 결과에 dos/beppu만 해당 지역 데이터에 맞춰 포함, golf 같은 카테고리 slug 제외 |

동적 route resolver는 DB에 존재하지 않는 새 컬럼을 가정하지 않는다. 현재 group/code 값을 입력으로 받는다. 기존 route helper를 우선 재사용한다.

### 10.9 A02/A12/A13/A15/A16 — 나머지 항목의 구현 고정

| ID | 함수/라이브러리 | 해야 할 일과 기대 결과 |
|---|---|---|
| A02 | pg 카탈로그, `has_function_privilege`, 기존 RPC | 네 삭제 함수의 정확한 signature별 권한 확인; 불필요 PUBLIC/anon/authenticated EXECUTE 회수, server 역할만 허용; 익명 삭제 권한=false |
| A12 | `manage-entities/[id] GET`, `getDynamicLabels` | Promise 결과에서 error를 반드시 검사; 필수 query 실패는 서버 오류, 빈 정상 데이터와 구별; 실패 폼 저장 금지 |
| A12 | `serverError(err)` | 상세는 console.error에 기록, 응답은 고정 SERVER_ERROR/일반 안내; raw DB message 비노출 |
| A13 | `scripts/verify-cms-schema.mjs`, `pg` | DIRECT_URL 필수; read-only transaction에서 information_schema/pg_catalog 확인; 누락 컬럼·함수 발견 시 exit 1, 모두 맞으면 exit 0; DDL/DML 금지 |
| A15 | debug/query-timing GET | production이면 측정 시작 전에 404 반환; production 반복 쿼리 0회 |
| A16 | 새 migration | public 전체 정책 DROP loop 사용 금지; 대상 table/policy 명시; 범위 밖 정책 전후 동일 |

스키마 검증 스크립트가 환경변수 없음/DB 연결 실패를 PASS로 처리해서는 안 된다. 비밀번호/접속 문자열은 출력하지 않는다.

### 10.10 실행할 검증 명령과 결과물

프로젝트가 요구하는 Node 22, 현재 package-lock.json 기준으로 실행한다. 아래 test 경로는 에이전트가 추가할 제안 경로이며 현재 존재하는 파일로 착각하지 않는다.

```bash
npm ci
npm run typecheck
npm run lint
npm run verify:cms-schema
node --import tsx --test tests/admin-session.test.ts tests/admin-api-contract.test.ts tests/travel-time.test.ts
npx playwright test tests/cms-crud.spec.ts
npm run build
```

DB 검증은 격리된 DB 환경에서 실행한다. 설치된 Playwright 버전에 맞는 설정을 사용한다. 인증 테스트는 순수 token 함수, 계약 테스트는 mock fetch, CRUD 통합 테스트는 실제 테스트 DB를 사용한다.

최소 검증 결과표:

| 테스트 | 입력 | 기대 |
|---|---|---|
| 중복 분류 | POST 409 + DUPLICATE_CODE | 중복 안내, ConflictError 아님 |
| 오래된 폼 | PUT 409 + STALE_VERSION | 오래된 화면 안내, 입력값 보존 |
| 실제 삭제 | 생성한 category ID 삭제 | DB 0행, 동일 TEST 코드 재생성 201 |
| 시간 저장 | 35분 → 45분 | DB와 새 브라우저 45분 |
| 관계 보존 | 연결 3개 맛집의 이름 수정 | 연결 수 3 유지 |
| 원자성 | subtype 저장 오류 주입 | 부분 entity 생성 0건 |
| 인증 비용 | 정상 관리자 API 인증 검사 | 인증 DB query 0회 |
| 일반 방문 | 비로그인 지역/FAQ 조회 | 로그인 요구 없음, 기존 ISR 유지 |

매 항목마다 변경 파일·함수명, 실제 HTTP status/body, DB 검증 결과, 실행 명령과 exit code를 보고한다. “확인 완료”만 작성하지 않는다. 성능 최적화는 같은 경로의 query 수·반환 row 수·응답 시간을 전후 비교하며, 이번 문서에 없는 라이브러리 도입으로 범위를 넓히지 않는다.

API 근거: [Node 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html), [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath), [Supabase DELETE](https://supabase.com/docs/reference/javascript/delete). 실제 구현 시 설치된 Next.js 문서와 타입을 최종 기준으로 확인한다. Supabase changelog URL은 이번 조회에서 열리지 않아 최신 변경 검토 완료로 표시하지 않는다.


## 11. 선택적 SQL 감사 연결 — 앱 필수 설정 아님

앱 연결의 최종 기준은 아래 12절의 Supabase URL과 publishable key다. 이 절의 SQL 연결은 고급 스키마 감사가 가능한 환경에서만 사용하는 선택적 경로이며 앱 구동이나 일반 CRUD 수정의 전제 조건이 아니다.

프로젝트 식별자: `hzmaypxlpzbnfkevpqss`. 사용자가 제공한 연결 대상이며 SQL 접속 성공을 확인한 상태는 아니다. `[YOUR-PASSWORD]`는 자리표시자다. 실제 비밀번호는 실행 환경의 비밀 ENV에 설정하고 MD/코드/로그에 기록하지 않는다.

| ENV | 접속 대상 | 이 프로젝트에서 사용할 목적 |
|---|---|---|
| DATABASE_URL | aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres | 사용자가 제공한 transaction-mode pooler. 향후 직접 SQL 앱 조회를 선택할 경우의 연결이며 현재 앱 전환 지시가 아님 |
| DIRECT_URL | aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres | 사용자 제공 session-mode pooler. 이번 읽기 전용 스키마 감사 및 승인된 마이그레이션 실행에 사용 |

두 연결의 사용자명은 `postgres.hzmaypxlpzbnfkevpqss`다. DIRECT_URL이라는 ENV 이름에도 불구하고 대상은 직접 DB 호스트가 아니라 세션 모드 pooler다. 기존 문서의 user=postgres 표현 대신 이 실제 연결 사용자명을 사용한다.

앱의 getSupabaseServer()/getSupabaseAdmin()은 기존 Supabase HTTP 클라이언트를 유지한다. URL을 받았다는 이유로 Prisma 설치, pg 기반 앱 전면 전환, 연결 풀 두 개의 동시 실행을 하지 않는다. `pgbouncer=true`라는 URL 파라미터만으로 node-postgres가 별도 pooler 모드로 설정된다고 가정하지 않는다.

### 11.1 읽기 전용 접속 검증 스크립트 계약

기존 `scripts/verify-cms-schema.mjs`에 설치된 `pg`의 `Client`를 사용한다. 단발성 감사이므로 Pool을 여러 개 만들지 않는다. ENV는 Node 22의 `--env-file`로 읽고 dotenv를 새로 설치하지 않는다.

```js
import pg from 'pg';
const { Client } = pg;
const connectionString = process.env.DIRECT_URL;
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('DIRECT_URL의 실제 접속 정보가 필요합니다.');
  process.exit(1);
}
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
  application_name: 'japan-guide-schema-audit',
});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '10s'");
  const { rows } = await client.query(
    'SELECT current_database() AS database, current_user AS role'
  );
  console.log(rows); // 접속 문자열/비밀번호 출력 금지
  // information_schema / pg_catalog 검증 쿼리를 여기에 실행
  await client.query('ROLLBACK');
} catch (error) {
  // 원본 error/config 전체를 출력하지 않는다.
  console.error('DB 접속 또는 스키마 검증 실패', { code: error?.code ?? 'UNKNOWN' });
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
```

TLS 인증서 검증이 실패하면 프로젝트 인증서 설정을 확인하고 필요한 CA를 client.ssl.ca에 공급한다. 통과시키려고 rejectUnauthorized=false로 바꾸지 않는다. URL에 별도 sslmode 옵션이 있으면 pg의 ssl 옵션과 충돌하는지 확인한다.

실행 예:

```bash
node --env-file=.env.local scripts/verify-cms-schema.mjs
```

기대 결과: database=postgres, 실제 연결 role 표시, 이후 스키마 검사 통과 시 exit 0. 비밀번호 누락·인증 실패·접속 제한·스키마 불일치는 exit 1. 접속 성공과 데이터 정합성 검증 성공을 구분해 보고한다.

### 11.2 카테고리 추가 오류 확인용 읽기 쿼리

실제 columns를 먼저 확인한 후 다음 매개변수 쿼리를 실행한다. 테스트 항목을 자동 삭제하지 않는다.

```js
const result = await client.query(
  `SELECT id, code, label, active, group_type
   FROM public.categories
   WHERE upper(code) = $1 OR lower(label) = $2`,
  ['TEST', 'test']
);
```

기대: 0행이면 TEST 중복이라고 단정하지 않고 실제 실패 응답의 constraint/code를 확인한다. 1행 이상이면 활성/숨김 여부와 연결 데이터를 확인한다. 실제 삭제 기능 변경 후 격리 fixture에서 삭제→동일 code 재생성 검증을 한다. 사용자에게 비밀번호를 채팅에 붙여넣도록 요구하지 않는다.


## 12. 최종 앱 연결 기준 — 사용자가 지정한 Supabase 프로젝트

사용자의 최신 지정에 따라 앱은 아래 프로젝트와 publishable key를 사용한다. Markdown 링크 문법이나 역슬래시를 ENV에 넣지 않는다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://hzmaypxlpzbnfkevpqss.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XkMv3kdjev3u7zc7E4ZGig_WYbb0y9h
```

이 값은 사용자가 제공한 공개 클라이언트 설정이다. 관리자 비밀번호는 기존 ADMIN_PASSWORD 하나이며, DB 서버 권한을 위한 기존 SUPABASE_SECRET_KEY는 별도 서버 전용 인프라 키다. 두 키를 혼동하지 않는다. SUPABASE_SECRET_KEY를 NEXT_PUBLIC 변수로 옮기거나 publishable key로 덮어쓰지 않는다.

### 12.1 지정 함수와 초기화

- `src/lib/supabase/server.ts:getSupabaseServer()` 및 기존 browser client는 위 URL/publishable key로 설치된 `@supabase/supabase-js`의 `createClient()`를 호출한다.
- 일반 공개 조회는 기존 RLS SELECT 권한으로 수행한다.
- `src/lib/supabase/admin.ts:getSupabaseAdmin()`은 위와 같은 URL과 기존 서버 ENV SUPABASE_SECRET_KEY를 사용한다. 이 파일의 `import 'server-only'`를 유지한다.
- 관리자 API는 A01의 ENV 비밀번호 기반 서명 쿠키 검증 후 admin client를 호출한다. Supabase Auth 로그인·회원가입·사용자 계정을 새로 만들지 않는다.
- 관리자 비밀번호가 맞다는 사실만으로 publishable key의 DB 권한이 올라가지는 않는다. 관리자 쓰기를 가능하게 하려고 anon INSERT/UPDATE/DELETE 정책을 열지 않는다.
- 앱을 DATABASE_URL/DIRECT_URL 기반으로 전환하지 않는다. 11절은 선택적 읽기 전용 SQL 감사용이다.

기대 결과: 공개 페이지 조회는 로그인 없이 작동; 관리자 인증 DB query 0회; 기존 서버 키가 설정된 관리자 API만 실제 저장/삭제 가능. 서버 키가 없는 환경은 관리자 DB 저장 검증 미완료로 보고한다.

### 12.2 가능한 검증과 불가능한 검증 구분

publishable key로 허용된 Data API SELECT는 읽기 검증에 사용할 수 있다. 예: categories의 TEST code 조회. 조회가 실패하면 HTTP status와 허용 범위를 확인하고 RLS를 해제하지 않는다. 삭제 RPC나 쓰기 API를 공개 키로 시험하지 않는다.

publishable key만으로 pg_catalog, 실제 FK/트리거/함수 ACL을 모두 확인했다고 보고하지 않는다. 선택적 SQL 연결 또는 별도 허용된 관리 접근이 없으면 A02 등의 DB 권한 검증은 미완료로 유지한다. 공개 조회 성공만으로 관리자 CRUD까지 PASS라고 보고하지 않는다.

### 12.3 이번 연결로 추가 확인한 실제 DB 증거

2026-09-18, 사용자가 제공한 URL/publishable key로 categories에 읽기 전용 GET을 수행했다. 요청 필터는 code=eq.TEST, 조회 컬럼은 id/code/label/active/group_type. HTTP 200 결과:

```json
{"id":"6467368f-60d6-489f-82ec-62cad8324d3e","code":"TEST","label":"테스트","active":false,"group_type":"SYSTEM"}
```

A17의 기존 미확인 사항 중 **TEST 코드의 기존 비활성 행 존재는 이제 DB 조회로 확인되었다.** test 입력이 TEST로 변환되는 현재 코드와 중복 설명이 일치한다. 다만 사용자 실패 요청의 로그/constraint는 조회하지 않았고, 이 행이 과거 삭제로 남은 것인지 명시적 숨김인지도 확정하지 않는다. group_type=SYSTEM의 용도와 참조를 확인하기 전 자동 삭제하지 않는다.

이 조회는 행 수정·삭제를 수행하지 않았다. 전체 스키마·함수 권한·관리자 저장 검증을 수행했다는 의미는 아니다. 위 1절/9절의 운영 DB 미조회 설명은 최초 감사 당시 기준이며, 이번 추가 조회 범위는 이 절을 따른다.
