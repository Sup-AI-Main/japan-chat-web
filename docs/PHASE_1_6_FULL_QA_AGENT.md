# Phase 1~6 전체 QA Agent 실행 지시서

## 목표

현재 배포 커밋을 기준으로 CMS V2 Phase 1~6이 실제로 구현·동작하는지 테스트하고, 결과를 `docs/PHASE_1_6_FULL_QA_REPORT.md`에 기록하라.

검증 대상 커밋은 실행 시 `git rev-parse HEAD`로 확인한다. 추측으로 SHA를 기록하지 마라.

## 기본 규칙

- `AGENTS.md`, `docs/agent/verification.md`, `docs/agent/cms-data-model.md`를 먼저 읽는다.
- 이미지·스크린샷을 모델 요청이나 QA 증거로 사용하지 않는다. Playwright는 DOM text, URL, HTTP status, console, network request만 수집한다.
- 운영 DB를 변경하는 테스트는 임시 데이터에 `QA_PHASE5_TEMP`를 넣고, 테스트 종료 전에 반드시 삭제한다.
- 비밀번호를 파일·로그·커밋에 기록하지 않는다. 실행 시 환경변수를 사용한다.
- 같은 검증이 2회 실패하면 3회째 자동 재시도하지 말고 `BLOCKED`로 보고한다.

## 실행 준비

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://japan-chat-web.vercel.app"
$env:QA_ADMIN_PASSWORD = "<실행 시 주입>"
git rev-parse HEAD
npm run typecheck
npm run build
```

`QA_ADMIN_PASSWORD`의 실제 값은 명령 실행 환경에서만 주입하고 이 문서나 결과 파일에는 남기지 않는다.

## 1. 정적 코드 QA

다음 결과를 기록한다.

```powershell
rg -n "EntityDetailsEditor|/api/admin/entity-editor" src
rg -n "IncludesExcludesEditor|ContentSectionsEditor" src
rg -n "details_json|admin_save_entity_editor_v1|expected_updated_at" src supabase/migrations
git diff --check
npm run typecheck
npm run build
npm run lint
```

판정:

- CMS V2 편집기와 저장 API 연결이 있어야 한다.
- 관리자 drawer에 레거시 편집기 참조가 없어야 한다.
- 기존 `/api/admin/content-sections`, `/api/admin/includes` 파일은 삭제하지 않아야 한다.
- lint의 기존 오류와 이번 변경으로 새로 생긴 오류를 구분한다.

## 2. Supabase 읽기 QA

프로젝트 ID는 실행 시 실제 프로젝트를 확인한다. 아래 SQL은 읽기 전용이다.

```sql
select 'content_sections' as table_name, count(*) as row_count from public.content_sections
union all select 'includes_excludes', count(*) from public.includes_excludes
union all select 'field_definitions', count(*) from public.field_definitions
union all select 'section_definitions', count(*) from public.section_definitions;

select entity_type,
       count(*) as total,
       count(*) filter (where active) as active_count,
       count(*) filter (where details_json is not null) as with_details
from public.entities
group by entity_type
order by entity_type;

select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='entities' and column_name='details_json';
```

기록 항목:

- 조회 시각
- 실제 row counts
- entity type별 active/details_json counts
- `details_json`가 `jsonb`인지
- DB 변경 없음

## 3. Playwright 텍스트 전용 QA

Playwright 테스트를 작성하거나 기존 Playwright 설정을 사용한다. 스크린샷 저장·첨부·판독은 하지 않는다.

### 공개 페이지

실제 존재하는 URL을 DB 목록에서 선택해 다음을 검사한다.

- `/dos/golf`, `/dos/hotel`, `/dos/restaurant`, `/dos/attraction`
- 실제 상세 URL 1개씩
- HTTP 200
- DOM에 주요 entity 텍스트 존재
- reload 후 동일 텍스트 존재
- console error 없음
- 관련 네트워크 요청 실패 없음

Attraction 데이터가 0개면 목록 empty state만 PASS로 기록하고 실데이터 E2E는 `BLOCKED`로 기록한다.

### 관리자 로그인

앱이 비밀번호만 요구하면 비밀번호 입력란에 `process.env.QA_ADMIN_PASSWORD`를 입력한다. 아이디 입력을 가정하지 않는다.

```ts
await page.goto(`${baseUrl}/admin`);
await page.getByLabel(/비밀번호|password/i).fill(process.env.QA_ADMIN_PASSWORD!);
await page.getByRole('button', { name: /로그인|login/i }).click();
await expect(page).toHaveURL(/admin/);
```

실제 label이 다르면 DOM text/role을 확인해 최소 수정한다. 비밀번호 값은 출력하지 않는다.

### 관리자 entity drawer

`/admin/[area]/entities`에서 실제 entity를 연다.

확인:

- `세부사항 (CMS V2)`와 `세부사항 수정` 버튼이 존재
- `포함/불포함 사항` 레거시 편집기와 `추가 안내` 레거시 편집기가 별도 UI로 존재하지 않음
- 버튼 클릭 시 CMS V2 editor modal이 열림
- GET `/api/admin/entity-editor?entity_id=...` 응답 200
- editor에 sections/items가 표시됨
- 테스트 문구를 한 개 추가하거나 기존 임시 entity를 수정
- PUT `/api/admin/entity-editor` 응답 성공
- 모달을 닫고 drawer를 다시 열어 값 유지
- 페이지 reload 후 값 유지
- `details_json` DB query로 값 확인
- 테스트 문구는 원래 값으로 복구하고 DB query로 복구 확인

저장 테스트 대상은 먼저 원본 `details_json`, `updated_at`를 조회해 백업한다. 데이터가 없는 Attraction을 위해 임의 운영 데이터를 만들지 말고, 별도 승인된 임시 row만 사용한다.

### 관리자 메뉴/Legacy

- 일반 관리자 dashboard에 LabelManager 링크가 없어야 한다.
- 직접 `/admin/[area]/labels` 접근 시 `Legacy` 안내가 보여야 한다.

### 네트워크 검사

Playwright request/response 이벤트로 editor 흐름 중 다음 요청이 없는지 확인한다.

```text
/api/admin/content-sections POST/PUT/DELETE
/api/admin/includes POST/PUT/DELETE
```

CMS V2 editor 저장에서는 다음 요청이 있어야 한다.

```text
/api/admin/entity-editor GET
/api/admin/entity-editor PUT
```

## 4. Phase별 판정

- Phase 1: `details_json` schema, validation, optimistic concurrency, RPC/API 확인
- Phase 2: Golf 실제 공개 렌더 + CMS V2 조회/저장/reload
- Phase 3: Hotel 실제 공개 렌더 + CMS V2 조회/저장/reload
- Phase 4: Restaurant 실제 공개 렌더 + CMS V2 조회/저장/reload
- Phase 5: Attraction 코드·empty state. 실데이터가 있으면 생성/수정/reload/삭제까지 수행하고 없으면 `BLOCKED`
- Phase 6: 레거시 editor 제거, admin drawer CMS V2 연결, old API 파일 유지, 네트워크에서 old write 0건

## 5. 배포 확인

- GitHub 최신 커밋 SHA를 확인한다.
- Vercel Production deployment가 `Ready`인지 확인한다.
- deployment commit SHA와 검사 대상 SHA가 일치하는지 확인한다.
- SHA가 다르면 Production E2E 결과를 최신 코드 검증으로 사용하지 말고 `DEPLOYMENT_MISMATCH`로 기록한다.

## 6. 결과 보고 파일

`docs/PHASE_1_6_FULL_QA_REPORT.md`를 작성한다.

```text
QA_SHA:
DEPLOYED_SHA:
PRODUCTION_SHA_MATCH:

PHASE_1:
PHASE_2_GOLF:
PHASE_3_HOTEL:
PHASE_4_RESTAURANT:
PHASE_5_ATTRACTION:
PHASE_6:

TYPECHECK:
BUILD:
LINT:
DB_SCHEMA:
DB_COUNTS:
PUBLIC_E2E:
ADMIN_LOGIN:
ADMIN_CMS_V2_E2E:
RELOAD_PERSISTENCE:
OLD_API_WRITE_REQUESTS:
CMS_V2_API_REQUESTS:

CODE_VERIFIED:
DB_VERIFIED:
FUNCTION_VERIFIED:
DEPLOY_VERIFIED:
FINAL_RESULT:
```

각 결과 옆에 파일 경로, 함수/route, 명령, HTTP status, DOM text, SQL 결과를 짧게 적는다. 스크린샷 경로는 적지 않는다.

검증이 막히면 아래 형식으로 기록한다.

```text
STATUS: BLOCKED
FAILED_COMMAND_OR_REQUEST:
HTTP_STATUS:
ERROR:
CONFIRMED:
UNKNOWN:
NEXT_ACTION: 정확히 한 가지
```
